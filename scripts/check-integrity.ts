// Ma'lumot yaxlitligi diagnostikasi (CLI).
//   npx tsx scripts/check-integrity.ts          # faqat ko'rsatadi (read-only)
//   npx tsx scripts/check-integrity.ts --fix    # topilgan driftni tuzatadi
//
// Guruh sozlamasi ↔ dars qatorlari "drift"ini (vaqt/kun/duration/narx), filialsiz
// guruhlarni va probelli ismlarni topadi. --fix reconciler'ni qayta ishlatadi.
// Auth'ga bog'liq emas (JWT_SECRET shart emas).

import { prisma } from '@/lib/db';
import { todayTz } from '@/lib/date';
import { checkIntegrity } from '@/lib/integrity';
import { reconcileFutureLessons } from '@/lib/reconcile-lessons';

const FIX = process.argv.includes('--fix');
const norm = (s: string) => s.trim().replace(/\s+/g, ' ');

async function main() {
  const today = todayTz();
  const report = await checkIntegrity(prisma, today);

  console.log(`\n=== Yaxlitlik tekshiruvi (${today}) — ${report.groupsChecked} faol guruh ===\n`);

  if (report.groups.length === 0) {
    console.log('✓ Guruh↔dars drift topilmadi.');
  } else {
    console.log(`⚠ ${report.groups.length} guruhda drift:`);
    for (const g of report.groups) {
      const k = g.kinds;
      const parts = [
        k.timeMismatch && `vaqt:${k.timeMismatch}`,
        k.wrongDayLessons && `noto'g'ri-kun:${k.wrongDayLessons}`,
        k.missingDays && `yetishmayotgan-kun:${k.missingDays}`,
        k.durationMismatch && `duration:${k.durationMismatch}`,
        k.rateDrift && `narx-drift:${k.rateDrift}`,
        k.branchNull && `filialsiz`,
      ].filter(Boolean).join(', ');
      console.log(`  • ${g.groupName} (ustoz: ${g.teacherName}) → ${parts}`);
    }
  }

  console.log(`\nProbelli ismlar: ${report.dirtyNames.length}`);
  report.dirtyNames.slice(0, 10).forEach(u => console.log(`  '${u.name}'`));
  if (report.dirtyNames.length > 10) console.log(`  ... va yana ${report.dirtyNames.length - 10} ta`);

  if (!FIX) {
    console.log('\n(Tuzatish uchun --fix bilan qayta ishga tushiring)');
    return;
  }

  console.log('\n=== TUZATISH (--fix) ===');
  for (const g of report.groups) {
    const grp = await prisma.group.findUnique({
      where: { id: g.groupId },
      select: { dayType: true, time: true, duration: true, price: true, lessonsPerMonth: true, teacherId: true, branchId: true },
    });
    if (!grp) continue;

    // Filialsiz → ustoz filialidan meros
    if (g.kinds.branchNull && grp.teacherId) {
      const t = await prisma.user.findUnique({ where: { id: grp.teacherId }, select: { branchId: true } });
      if (t?.branchId) {
        await prisma.group.update({ where: { id: g.groupId }, data: { branchId: t.branchId } });
        console.log(`  ${g.groupName}: filial → ${t.branchId}`);
      }
    }

    // Kun muammosi (yetishmayotgan/noto'g'ri kun) + toq/juft → dayType regeneratsiya (hammasini tuzatadi)
    const needsRegen = (g.kinds.missingDays > 0 || g.kinds.wrongDayLessons > 0) && (grp.dayType === 'toq' || grp.dayType === 'juft');
    const change = needsRegen
      ? { dayType: grp.dayType }
      : { time: grp.time, duration: grp.duration, price: grp.price, lessonsPerMonth: grp.lessonsPerMonth };
    const r = await reconcileFutureLessons(g.groupId, change, { today });
    console.log(`  ${g.groupName}: ${JSON.stringify({ vaqt: r.timeUpdated, duration: r.durationUpdated, narx: r.rateUpdated, o_chirildi: r.deleted, yaratildi: r.regenerated })}`);
  }

  // Probelli ismlarni normallashtirish
  let nameFixed = 0;
  for (const u of report.dirtyNames) {
    await prisma.user.update({ where: { id: u.id }, data: { name: norm(u.name) } });
    nameFixed++;
  }
  if (nameFixed) console.log(`  Ism normallashtirildi: ${nameFixed}`);

  console.log('\n✓ Tuzatish tugadi.');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
