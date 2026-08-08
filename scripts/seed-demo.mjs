// Demo sandbox uchun namunali ma'lumot. Idempotent: har safar hammani o'chirib qayta yaratadi.
// Foydalanish (demo nusxada):  node scripts/seed-demo.mjs
// Kunlik avto-reset cron shu skriptni ishga tushiradi.

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const hash = (pw) => bcrypt.hashSync(pw, 10);
const PW = 'demo2024';

// ── Sana yordamchilari (demo har doim "joriy" ko'rinishi uchun nisbiy) ──
const DAY_MAP = { toq: [1, 3, 5], juft: [2, 4, 6] }; // Dush/Chor/Jum · Sesh/Pay/Shan
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const today = new Date(); today.setHours(0, 0, 0, 0);
const monthStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];

// dayType bo'yicha [startDate, +days] oralig'idagi dars sanalarini qaytaradi
function lessonDates(startDate, days, dayType) {
  const allow = DAY_MAP[dayType] || DAY_MAP.toq;
  const out = [];
  let cur = new Date(startDate);
  for (let i = 0; i < days; i++) {
    if (allow.includes(cur.getDay())) out.push(iso(cur));
    cur = addDays(cur, 1);
  }
  return out;
}

async function wipe() {
  // FK-xavfsiz tartib (bolalar avval)
  await prisma.attendance.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.groupStudent.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.note.deleteMany().catch(() => {});
  await prisma.message.deleteMany().catch(() => {});
  await prisma.notification.deleteMany().catch(() => {});
  await prisma.ticketMessage?.deleteMany().catch(() => {});
  await prisma.ticket?.deleteMany().catch(() => {});
  await prisma.lead.deleteMany();
  await prisma.smsCampaign.deleteMany().catch(() => {});
  await prisma.group.deleteMany();
  await prisma.user.deleteMany();
  await prisma.branch.deleteMany();
}

const FIRST = ['Ali', 'Vali', 'Sardor', 'Jasur', 'Bekzod', 'Aziz', 'Doston', 'Ulug\'bek', 'Sanjar', 'Diyor',
  'Malika', 'Nilufar', 'Dilnoza', 'Sevara', 'Kamola', 'Zilola', 'Madina', 'Gulnoza', 'Shahnoza', 'Feruza',
  'Islom', 'Javohir', 'Otabek', 'Shohruh', 'Aziza', 'Nozima', 'Laziza', 'Muhammad'];
const LAST = ['Karimov', 'Rahimov', 'Yusupov', 'Tosheva', 'Ergasheva', 'Sobirov', 'Aliyeva', 'Xolmatov',
  'Sultonova', 'Qodirov', 'Ibragimova', 'Nazarov', 'Umarova', 'Hasanov', 'Yo\'ldosheva'];

async function main() {
  console.log('Demo ma\'lumot tozalanmoqda...');
  await wipe();

  // ── Filiallar ──
  const b1 = await prisma.branch.create({ data: { name: 'Chilonzor filiali', address: 'Toshkent, Chilonzor 12', phone: '+998 71 200 10 10' } });
  const b2 = await prisma.branch.create({ data: { name: 'Yunusobod filiali', address: 'Toshkent, Yunusobod 4', phone: '+998 71 200 20 20' } });

  // ── Kirish akkauntlari (demo tugmalari uchun barqaror loginlar) ──
  await prisma.user.create({ data: { login: 'demo', password: hash(PW), rawPass: PW, name: 'Demo Administrator', role: 'superadmin', phone: '+998 90 000 00 01' } });
  const admin = await prisma.user.create({ data: { login: 'admin1', password: hash(PW), rawPass: PW, name: 'Aziza Karimova', role: 'admin', phone: '+998 90 000 00 02', branchId: b1.id } });

  // ── O'qituvchilar ──
  const mkTeacher = (login, name, subject, level, branchId) =>
    prisma.user.create({ data: { login, password: hash(PW), rawPass: PW, name, role: 'teacher', subject, level, phone: '+998 90 ' + Math.floor(1000000 + Math.random() * 8999999), branchId } });
  const ustoz = await mkTeacher('ustoz', 'Shahboz Boliboyev', 'Matematika', 'senior', b1.id);
  const t2 = await mkTeacher('teacher2', 'Javohir Bratov', 'Ingliz tili', 'middle', b1.id);
  const t3 = await mkTeacher('teacher3', 'Dilnoza Yusupova', 'Fizika', 'senior', b1.id);
  const t4 = await mkTeacher('teacher4', 'Sardor Nazarov', 'Ona tili', 'junior', b2.id);

  // ── Guruhlar ──
  const groupsDef = [
    { name: 'MATH-01', subject: 'Matematika', teacher: ustoz, dayType: 'toq', time: '09:00', duration: '2 soat', room: '1-xona', price: 450000, branch: b1 },
    { name: 'ENG-B1', subject: 'Ingliz tili', teacher: t2, dayType: 'juft', time: '14:00', duration: '2.5 soat', room: '2-xona', price: 500000, branch: b1 },
    { name: 'PHYS-09', subject: 'Fizika', teacher: t3, dayType: 'toq', time: '16:00', duration: '2 soat', room: '3-xona', price: 480000, branch: b1 },
    { name: 'ENG-A2', subject: 'Ingliz tili', teacher: t2, dayType: 'juft', time: '18:00', duration: '2 soat', room: '2-xona', price: 400000, branch: b1 },
    { name: 'ONA-05', subject: 'Ona tili', teacher: t4, dayType: 'toq', time: '10:00', duration: '1.5 soat', room: '1-xona', price: 350000, branch: b2 },
  ];
  const startDate = iso(addDays(today, -35)); // ~5 hafta oldin boshlangan
  const groups = [];
  for (const g of groupsDef) {
    const grp = await prisma.group.create({
      data: {
        name: g.name, subject: g.subject, teacherId: g.teacher.id, schedule: '', meetLink: '',
        mode: 'offline', status: 'active', maxStudents: 15, startDate, room: g.room,
        dayType: g.dayType, time: g.time, duration: g.duration, language: 'uz',
        price: g.price, lessonsPerMonth: 12, branchId: g.branch.id,
      },
    });
    groups.push({ ...grp, _branch: g.branch });
  }

  // ── O'quvchilar + ota-onalar + guruhga biriktirish ──
  let nameIdx = 0;
  const nextName = () => `${rnd(FIRST)} ${rnd(LAST)}`;
  const students = [];

  async function makeStudent(fixedLogin, fixedName, group) {
    const name = fixedName || nextName();
    const login = fixedLogin || `oquvchi${++nameIdx}`;
    const phone = '+998 9' + Math.floor(10000000 + Math.random() * 89999999);
    // Ota-ona akkaunti
    const parent = await prisma.user.create({
      data: { login: fixedLogin ? 'otaona' : `${login}_ota`, password: hash(PW), rawPass: PW,
        name: name.split(' ')[1] + ' oilasi', role: 'parent', phone, branchId: group._branch.id },
    });
    const student = await prisma.user.create({
      data: { login, password: hash(PW), rawPass: PW, name, role: 'student', phone,
        branchId: group._branch.id, parentId: parent.id },
    });
    await prisma.groupStudent.create({ data: { groupId: group.id, studentId: student.id } });
    students.push({ ...student, _group: group });
    return student;
  }

  // Barqaror demo o'quvchi/ota-ona (login tugmasi uchun) — MATH-01 da
  await makeStudent('oquvchi', 'Islom Karimov', groups[0]);
  // Qolgan o'quvchilar
  const perGroup = [5, 6, 4, 5, 4];
  for (let gi = 0; gi < groups.length; gi++) {
    for (let k = 0; k < perGroup[gi]; k++) await makeStudent(null, null, groups[gi]);
  }

  // ── Darslar (o'tgan + kelasi) + davomat + baholar ──
  for (const grp of groups) {
    const dates = lessonDates(startDate, 55, grp.dayType); // ~8 hafta oraliq
    const grpStudents = students.filter(s => s._group.id === grp.id);
    let order = 0;
    for (const date of dates) {
      order++;
      const lesson = await prisma.lesson.create({
        data: { groupId: grp.id, scheduledDate: date, scheduledTime: grp.time,
          duration: grp.duration, order, topic: order <= 6 ? `${order}-mavzu` : null },
      });
      // Faqat o'tgan darslarga davomat
      if (date < iso(today)) {
        for (const st of grpStudents) {
          const present = Math.random() > 0.15; // ~85% keladi
          await prisma.attendance.create({
            data: { lessonId: lesson.id, studentId: st.id, present,
              scoreAttend: present ? 5 : 0,
              scoreHomework: present ? Math.floor(3 + Math.random() * 3) : 0,
              scoreActivity: present ? Math.floor(2 + Math.random() * 4) : 0 },
          });
        }
      }
    }
  }

  // ── To'lovlar (bir qismi to'lagan → qolgani qarzdor ko'rinadi) ──
  const thisMonth = monthStr(today);
  const prevMonth = monthStr(addDays(today, -30));
  for (const st of students) {
    // ~65% joriy oyni to'lagan
    if (Math.random() > 0.35) {
      await prisma.payment.create({ data: { studentId: st.id, amount: st._group.price, month: thisMonth, method: rnd(['cash', 'card', 'transfer']), type: 'payment' } });
    }
    await prisma.payment.create({ data: { studentId: st.id, amount: st._group.price, month: prevMonth, method: rnd(['cash', 'card']), type: 'payment' } });
  }

  // ── Lidlar (turli status/manba) ──
  const leadDefs = [
    ['Kamola Tosheva', 'new', 'instagram'], ['Bekzod Aliyev', 'contacted', 'telegram'],
    ['Nilufar Sobirova', 'trial', 'do\'stlar'], ['Doston Umarov', 'enrolled', 'instagram'],
    ['Sevara Nazarova', 'new', 'sayt'], ['Jasur Xolmatov', 'rejected', 'telegram'],
    ['Madina Qodirova', 'contacted', 'do\'stlar'], ['Aziz Hasanov', 'trial', 'instagram'],
  ];
  for (const [name, status, source] of leadDefs) {
    const first = name.charAt(0).toLowerCase();
    await prisma.lead.create({
      data: { leadId: `${first}${Math.random().toString(36).slice(2, 6)}`, name,
        phone: '+998 9' + Math.floor(10000000 + Math.random() * 89999999),
        status, source, branchId: b1.id, note: 'Demo lid' },
    });
  }

  const counts = {
    filial: 2, oquvchi: students.length, guruh: groups.length,
    ustoz: 4, lid: leadDefs.length,
  };
  console.log('✓ Demo ma\'lumot tayyor:', JSON.stringify(counts));
  console.log('  Kirish: demo/'+PW+' (superadmin) · ustoz/'+PW+' · otaona/'+PW+' · oquvchi/'+PW);
}

main()
  .catch((e) => { console.error('Seed xato:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
