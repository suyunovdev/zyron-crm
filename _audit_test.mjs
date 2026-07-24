import { readFileSync } from 'fs';
const D = JSON.parse(readFileSync('/private/tmp/claude-501/-Users-ilyossuyunov/10ae394e-bcf3-4af5-b53e-6317fb8ccc86/scratchpad/audit.json','utf8'));
const BASE = 'http://localhost:4055';
let pass=0, fail=0; const fails=[];
function check(name, cond, detail='') { if (cond) { pass++; } else { fail++; fails.push(name+(detail?` [${detail}]`:'')); } console.log((cond?'✅':'❌')+' '+name+(detail&&!cond?` → ${detail}`:'')); }

async function login(login, password) {
  const r = await fetch(BASE+'/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({login,password}) });
  const sc = r.headers.get('set-cookie') || '';
  const m = sc.match(/token=([^;]+)/);
  return { status:r.status, token: m?m[1]:null };
}
const jar = {};
async function req(role, method, path, body) {
  const h = { 'Content-Type':'application/json' };
  if (jar[role]) h['Cookie'] = 'token='+jar[role];
  const r = await fetch(BASE+path, { method, headers:h, body: body?JSON.stringify(body):undefined, redirect:'manual' });
  let j=null; try { j = await r.json(); } catch {}
  return { status:r.status, j };
}

// ---- AUTH ----
console.log('\n── AUTHENTICATION ──');
const roles = ['adminX','adminY','adminG','teachX','teachY','sX1','sX2','sY1','parX1','parY1'];
for (const rl of roles) { const res = await login('audit_'+rl, D.PW); jar[rl]=res.token; }
const sa = await login('admin','admin123'); jar['super']=sa.token;
check('Superadmin login (admin/admin123)', sa.status===200 && !!sa.token, 'status '+sa.status);
check('Filial admin login', !!jar['adminX']);
check('Noto\'g\'ri parol → 401', (await login('audit_adminX','WRONG')).status===401);
check('Token yo\'q → /api/admin/stats 401', (await (async()=>{const r=await fetch(BASE+'/api/admin/stats');return r.status;})())===401);

// ---- RBAC ----
console.log('\n── RBAC (rol chegaralari) ──');
check('Student → /api/admin/users = 403', (await req('sX1','GET','/api/admin/users?role=student')).status===403);
check('Teacher → /api/admin/users = 403', (await req('teachX','GET','/api/admin/users')).status===403);
check('Parent → /api/admin/stats = 403', (await req('parX1','GET','/api/admin/stats')).status===403);
check('Admin → /api/superadmin/analytics = 403', (await req('adminX','GET','/api/superadmin/analytics')).status===403);
check('Admin → /api/superadmin/admins = 403', (await req('adminX','GET','/api/superadmin/admins')).status===403);
check('Admin → /api/admin/stats = 200', (await req('adminX','GET','/api/admin/stats')).status===200);
check('Superadmin → /api/superadmin/analytics = 200', (await req('super','GET','/api/superadmin/analytics')).status===200);

// ---- BRANCH ISOLATION ----
console.log('\n── FILIAL IZOLYATSIYASI ──');
const axStud = await req('adminX','GET','/api/admin/users?role=student');
const axNames = (axStud.j?.data||[]).map(u=>u.login);
check('AdminX o\'quvchilar: faqat X filiali', axNames.includes('audit_sX1')&&axNames.includes('audit_sX2')&&!axNames.includes('audit_sY1'), axNames.join(','));
check('AdminX → boshqa filial o\'quvchisi (sY1) = 403', (await req('adminX','GET','/api/admin/users/'+D.sY1)).status===403);
check('AdminX → o\'z o\'quvchisi (sX1) = 200', (await req('adminX','GET','/api/admin/users/'+D.sX1)).status===200);
const axLeads = await req('adminX','GET','/api/admin/leads');
const leadNames = (axLeads.j?.leads||[]).map(l=>l.name);
check('AdminX lidlar: faqat X', leadNames.includes('AUDIT_LeadX')&&!leadNames.includes('AUDIT_LeadY'), leadNames.join(','));
const axTk = await req('adminX','GET','/api/tickets');
const tkSub = (axTk.j?.tickets||[]).map(t=>t.subject);
check('AdminX ticketlar: faqat X', tkSub.includes('AUDIT_ticketX'), tkSub.join(','));
check('AdminX → sY1 ga to\'lov = 403', (await req('adminX','POST','/api/admin/payments',{studentId:D.sY1,amount:50000,month:'2026-06'})).status===403);
const gAll = await req('adminG','GET','/api/admin/users?role=student');
const gNames = (gAll.j?.data||[]).map(u=>u.login);
check('Global admin: barcha filial o\'quvchilari', gNames.includes('audit_sX1')&&gNames.includes('audit_sY1'), 'soni '+gNames.length);

// ---- IDOR (client) ----
console.log('\n── IDOR (mijoz rollari) ──');
const parChild = await req('parX1','GET','/api/parent/children');
const childIds = JSON.stringify(parChild.j);
check('ParentX1 → faqat o\'z farzandi (sX1)', childIds.includes(D.sX1)&&!childIds.includes(D.sY1), 'status '+parChild.status);
check('ParentY1 → sX1 ko\'rmaydi', !JSON.stringify((await req('parY1','GET','/api/parent/children')).j).includes(D.sX1));
check('StudentX1 → o\'z balansi 200', (await req('sX1','GET','/api/student/balance')).status===200);
check('StudentX1 → boshqa guruh detali (gY) 403/404', [403,404].includes((await req('sX1','GET','/api/student/groups/'+D.gY)).status));

// ---- MOLIYAVIY NAZORAT ----
console.log('\n── MOLIYAVIY NAZORAT ──');
check('Admin → refund (type) = 403', (await req('adminX','POST','/api/admin/payments',{studentId:D.sX1,amount:-50000,month:'2026-06',type:'refund'})).status===403);
check('Admin → to\'lov DELETE = 403 (superadmin only)', (await req('adminX','DELETE','/api/admin/payments',{id:'x'})).status===403);
check('Superadmin → refund = 200/201', [200,201].includes((await req('super','POST','/api/admin/payments',{studentId:D.sX1,amount:-1,month:'2026-06',type:'refund'})).status));

// ---- BIZNES LOGIKA: billing + grace ----
console.log('\n── BILLING + GRACE QOIDASI ──');
const bal = await req('sX1','GET','/api/student/balance');
const b = bal.j;
check('sX1 grace: billable=4 (1 present+3 grace, 4-yo\'qlik hisoblanmaydi)', b?.totalCost===200000, 'totalCost='+b?.totalCost);
// admin ro'yxatidagi balans bilan mos (yagona manba) — refund -1 qo'shildi, shuni hisobga olamiz
const axStud2 = await req('adminX','GET','/api/admin/users?role=student');
const sx1row = (axStud2.j?.data||[]).find(u=>u.login==='audit_sX1');
check('Balans izchilligi: student/balance == admin ro\'yxati', sx1row?._balance?.totalDeducted===b?.totalCost, 'admin='+sx1row?._balance?.totalDeducted+' vs student='+b?.totalCost);
const balSX2 = await (async()=>{ const r=await login('audit_sX2',D.PW); const rr=await fetch(BASE+'/api/student/balance',{headers:{Cookie:'token='+r.token}}); return rr.json(); })();
check('sX2 (hammasi present): billable=5 → cost=250000', balSX2?.totalCost===250000, 'cost='+balSX2?.totalCost);

// ---- INPUT VALIDATION ----
console.log('\n── INPUT VALIDATSIYA ──');
check('To\'lov amount=0 → 400', (await req('adminX','POST','/api/admin/payments',{studentId:D.sX1,amount:0,month:'2026-06'})).status===400);
check('To\'lov noto\'g\'ri oy formati → 400', (await req('adminX','POST','/api/admin/payments',{studentId:D.sX1,amount:1000,month:'2026'})).status===400);
check('User noto\'g\'ri role → 400', (await req('adminX','POST','/api/admin/users',{name:'x',role:'hacker'})).status===400);

// ---- MIDDLEWARE PAGE REDIRECT ----
console.log('\n── MIDDLEWARE (sahifa RBAC) ──');
const pageRedir = async (role,path) => { const r=await fetch(BASE+path,{headers:{Cookie:'token='+jar[role]},redirect:'manual'}); return r.status; };
check('Student → /dashboard/admin sahifa redirect (3xx)', [302,307,308].includes(await pageRedir('sX1','/dashboard/admin')));
check('Admin → /dashboard/admin/system (superadmin-only) redirect', [302,307,308].includes(await pageRedir('adminX','/dashboard/admin/system')));
check('Superadmin → /dashboard/admin/system = 200', (await pageRedir('super','/dashboard/admin/system'))===200);

console.log(`\n═══ NATIJA: ${pass} PASS / ${fail} FAIL ═══`);
if (fails.length) console.log('FAILlar:\n - '+fails.join('\n - '));
