import type { ChildReport } from '@/lib/parent-report';
import type { InlineKeyboard } from '@/lib/telegram';
import { escapeHtml } from '@/lib/telegram';
import { fmtDayMonth } from '@/lib/date';

// Telegram bot xabar matnlari (o'zbekcha) va inline keyboardlar — sof funksiyalar.

/** "1 200 000 so'm" (ru-RU — bo'sh joyli guruhlash, loyiha uslubiga mos). */
function som(n: number): string {
  return `${Math.round(n).toLocaleString('ru-RU')} so'm`;
}

const hr = '\n————————————\n';

// ─── Keyboardlar ───

/** Farzand tanlash — har farzand alohida qator (kid:<id>). */
export function childrenKeyboard(children: Pick<ChildReport, 'id' | 'name'>[]): InlineKeyboard {
  return {
    inline_keyboard: children.map(c => [{ text: `👦 ${c.name}`, callback_data: `kid:${c.id}` }]),
  };
}

/** Ko'rsatkichlar menyusi (farzand tanlangach). */
export function metricsKeyboard(childId: string, hasSiblings: boolean): InlineKeyboard {
  const rows = [
    [
      { text: '📊 Baholar', callback_data: `g:${childId}` },
      { text: '📅 Davomat', callback_data: `a:${childId}` },
    ],
    [
      { text: '🏆 Reyting', callback_data: `r:${childId}` },
      { text: '💰 Qarzdorlik', callback_data: `d:${childId}` },
    ],
    [
      { text: '📚 Guruhlar', callback_data: `gr:${childId}` },
      { text: '📖 Mavzular', callback_data: `t:${childId}` },
    ],
  ];
  if (hasSiblings) rows.push([{ text: '◀️ Farzandlar', callback_data: 'back' }]);
  return { inline_keyboard: rows };
}

/** Tanishuv (intro) uchun — platformaga o'tuvchi URL tugmasi. */
export function introKeyboard(platformUrl: string): InlineKeyboard {
  return { inline_keyboard: [[{ text: '🌐 Platformaga kirish', url: platformUrl }]] };
}

/** Ko'rsatkich ko'rsatilgach — farzand menyusiga qaytish tugmasi. */
export function backKeyboard(childId: string): InlineKeyboard {
  return { inline_keyboard: [[{ text: '◀️ Orqaga', callback_data: `kid:${childId}` }]] };
}

// ─── Matnlar ───

export function welcomeText(parentName: string): string {
  return (
    `Assalomu alaykum, <b>${escapeHtml(parentName)}</b>! 👋\n\n` +
    `Aka-Uka o'quv markazi botiga xush kelibsiz. Bu yerda farzandingizning ` +
    `baholari, davomati, reytingi va to'lovlarini kuzatib borishingiz mumkin.\n\n` +
    `Quyidan farzandingizni tanlang:`
  );
}

export function chooseChildText(): string {
  return `Farzandingizni tanlang:`;
}

/** Tanishuv — botga birinchi (ulanmagan) kirganda. */
export function introText(): string {
  return (
    `👋 Assalomu alaykum!\n\n` +
    `Bu — <b>Aka-Uka o'quv markazi</b>ning ota-onalar uchun rasmiy boti.\n\n` +
    `Shu bot orqali farzandingizning:\n` +
    `📊 Baholari\n` +
    `📅 Davomati\n` +
    `🏆 Guruhdagi reytingi\n` +
    `💰 To'lov va qarzdorligi\n` +
    `📚 Guruhlari va o'tilgan mavzular\n\n` +
    `— bilan doimo xabardor bo'lasiz. Bundan tashqari, farzandingiz darsga kelmasa ` +
    `yoki to'lov qabul qilinsa — sizga avtomatik xabar keladi.\n\n` +
    `<b>Boshlash uchun:</b> platformaga kiring va profilingizdagi ` +
    `«Telegram'ga ulanish» tugmasini bosing.`
  );
}

/** Bitta farzand menyusi sarlavhasi. */
export function childMenuText(child: ChildReport): string {
  const groups = child.groups.map(g => `• ${escapeHtml(String(g.name))}`).join('\n') || '• —';
  return (
    `👤 <b>${escapeHtml(child.name)}</b>\n` +
    `Guruhlar:\n${groups}\n\n` +
    `Qaysi ma'lumotni ko'rmoqchisiz?`
  );
}

/** 📊 Baholar — har guruhda jami ball + so'nggi darslar. */
export function gradesText(child: ChildReport): string {
  let out = `📊 <b>${escapeHtml(child.name)}</b> — baholar\n`;
  if (child.groups.length === 0) return out + `\nHozircha guruh yo'q.`;

  for (const g of child.groups) {
    const me = g.ranking.leaderboard.find(l => l.isChild);
    const score = me ? `${me.totalScore}/${me.maxScore} ball` : '—';
    out += hr + `🔹 <b>${escapeHtml(String(g.name))}</b>\n   Umumiy ball: ${score}`;
  }

  const lessons = child.recentLessons.slice(0, 5);
  if (lessons.length) {
    out += `\n\n<b>So'nggi darslar:</b>\n`;
    out += lessons.map(l => {
      const mark = l.present === null ? '•' : l.present ? '✅' : '❌';
      const topic = l.topic ? ` — ${escapeHtml(l.topic)}` : '';
      return `${mark} ${fmtDayMonth(l.date)}${topic}`;
    }).join('\n');
  }
  return out;
}

/** 📅 Davomat — umumiy foiz + so'nggi darslar. */
export function attendanceText(child: ChildReport): string {
  const a = child.attendance;
  let out = `📅 <b>${escapeHtml(child.name)}</b> — davomat\n\n`;
  out += `Umumiy: <b>${a.pct}%</b> (${a.present}/${a.total} dars)`;

  const lessons = child.recentLessons.slice(0, 6);
  if (lessons.length) {
    out += `\n\n<b>So'nggi darslar:</b>\n`;
    out += lessons.map(l => {
      const mark = l.present === null ? '•' : l.present ? '✅' : '❌';
      return `${mark} ${fmtDayMonth(l.date)} — ${escapeHtml(l.groupName)}`;
    }).join('\n');
  }
  return out;
}

/** 🏆 Reyting — har guruhda o'rin + ball. */
export function ratingText(child: ChildReport): string {
  let out = `🏆 <b>${escapeHtml(child.name)}</b> — reyting\n`;
  if (child.groups.length === 0) return out + `\nHozircha guruh yo'q.`;

  for (const g of child.groups) {
    const r = g.ranking;
    const me = r.leaderboard.find(l => l.isChild);
    const score = me ? `${me.totalScore}/${me.maxScore} ball` : '—';
    const rank = r.childRank > 0 ? `${r.childRank} / ${r.totalStudents}` : '—';
    out += hr + `🔹 <b>${escapeHtml(String(g.name))}</b>\n   O'rin: <b>${rank}</b>  ·  ${score}`;
  }
  return out;
}

/** 💰 Qarzdorlik — to'langan / hisoblangan / balans. */
export function debtText(child: ChildReport): string {
  const b = child.balance;
  let out = `💰 <b>${escapeHtml(child.name)}</b> — hisob\n\n`;
  out += `To'langan: ${som(b.totalPaid)}\n`;
  out += `Hisoblangan: ${som(b.totalCost)}\n`;
  if (b.balance < 0) {
    out += `Balans: <b>−${som(-b.balance)}</b> (qarzdorlik) ❗️`;
  } else if (b.balance > 0) {
    out += `Balans: <b>+${som(b.balance)}</b> (haqdorlik) ✅`;
  } else {
    out += `Balans: <b>0 so'm</b> — qarzdorlik yo'q ✅`;
  }
  return out;
}

const DAY_LABELS: Record<string, string> = { toq: 'Dush/Chor/Jum', juft: 'Sesh/Pay/Shan' };

/** 📚 Guruhlar — ustoz, jadval, xona, narx. */
export function groupsText(child: ChildReport): string {
  let out = `📚 <b>${escapeHtml(child.name)}</b> — guruhlar\n`;
  if (child.groups.length === 0) return out + `\nHozircha guruh yo'q.`;

  for (const g of child.groups) {
    out += hr + `🔹 <b>${escapeHtml(String(g.name))}</b>`;
    if (g.subject) out += ` — ${escapeHtml(g.subject)}`;
    out += '\n';
    if (g.teacher?.name) out += `   👩‍🏫 Ustoz: ${escapeHtml(g.teacher.name)}\n`;
    const day = g.dayType ? (DAY_LABELS[g.dayType] || g.dayType) : '';
    const sched = [day, g.time].filter(Boolean).join(', ');
    if (sched) out += `   🕒 ${escapeHtml(sched)}\n`;
    if (g.room) out += `   📍 ${escapeHtml(g.room)}\n`;
    if (typeof g.price === 'number' && g.price > 0) out += `   💵 ${som(g.price)}/oy`;
  }
  return out;
}

/** 📖 O'tilgan mavzular — so'nggi darslar mavzusi + davomat. */
export function topicsText(child: ChildReport): string {
  let out = `📖 <b>${escapeHtml(child.name)}</b> — o'tilgan mavzular\n\n`;
  const lessons = child.recentLessons.slice(0, 8);
  if (lessons.length === 0) return out + `Hozircha o'tilgan darslar yo'q.`;

  out += lessons.map(l => {
    const mark = l.present === null ? '•' : l.present ? '✅' : '❌';
    const topic = l.topic ? escapeHtml(l.topic) : '<i>mavzu belgilanmagan</i>';
    const when = l.isToday ? 'Bugun' : fmtDayMonth(l.date);
    return `${mark} <b>${when}</b> — ${topic}\n   <i>${escapeHtml(l.groupName)}</i>`;
  }).join('\n');
  return out;
}
