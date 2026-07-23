// Ota-onasi bog'lanmagan mavjud o'quvchilarga avtomatik ota-ona akkaunti yaratadi.
// Idempotent: faqat parentId=null bo'lgan o'quvchilar. Har safar xavfsiz ishlaydi.
// Foydalanish:  node scripts/backfill-parents.mjs

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const CYR = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'j',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'x',ц:'s',ч:'ch',ш:'sh',щ:'sh',ъ:'',ы:'i',ь:'',э:'e',ю:'yu',я:'ya',ў:'o',қ:'q',ғ:'g',ҳ:'h' };
const loginBase = (name) => {
  const first = (name || '').trim().split(/\s+/)[0] || '';
  const b = first.toLowerCase().split('').map(c => CYR[c] ?? c).join('').replace(/[ʻʼ'`‘’]/g, '').replace(/[^a-z0-9]/g, '');
  return b || 'oquvchi';
};
const randomPassword = (len = 6) => { const ch = 'abcdefghjkmnpqrstuvwxyz23456789'; let p = ''; for (let i=0;i<len;i++) p += ch[Math.floor(Math.random()*ch.length)]; return p; };
const parentNameFrom = (n) => { const parts = (n||'').trim().split(/\s+/); return parts.length >= 2 ? `${parts[parts.length-1]} oilasi` : `${n} ota-onasi`; };
async function ensureUnique(login) {
  if (!(await prisma.user.findUnique({ where: { login }, select: { id: true } }))) return login;
  for (let i=0;i<50;i++){ const c = `${login}${Math.floor(100+Math.random()*900)}`; if (!(await prisma.user.findUnique({ where:{login:c}, select:{id:true} }))) return c; }
  return `${login}${Date.now().toString().slice(-6)}`;
}

const students = await prisma.user.findMany({ where: { role: 'student', parentId: null }, select: { id: true, name: true, login: true, phone: true } });
console.log(`Ota-onasiz o'quvchilar: ${students.length}`);
let done = 0;
for (const s of students) {
  const base = loginBase(s.name);
  const parentLogin = await ensureUnique(`${s.login || base}_ota`);
  const pass = randomPassword();
  const parent = await prisma.user.create({
    data: { login: parentLogin, password: bcrypt.hashSync(pass, 10), rawPass: pass, name: parentNameFrom(s.name), phone: s.phone || null, role: 'parent' },
  });
  await prisma.user.update({ where: { id: s.id }, data: { parentId: parent.id } });
  done++;
}
console.log(`✓ ${done} ta ota-ona yaratildi va bog'landi.`);
await prisma.$disconnect();
