import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { createNotification } from '@/lib/notify';
import { normalizePhone } from '@/lib/eskiz';
import {
  sendMessage, deleteMessage, answerCallbackQuery,
  isChannelMember, notifyStaff,
} from '@/lib/telegram-funnel';
import {
  pickKeyboard, membershipKeyboard, phoneKeyboard, skipKeyboard, restartKeyboard,
  membershipText, chooseBranchText, askNameText, askPhoneText, invalidPhoneText,
  chooseSubjectText, askOtherSubjectText, chooseTeacherText, noTeachersText, chooseSourceText,
  askFeedbackLikedText, askFeedbackDislikedText, submittedText, thankYouText, staffLeadText,
} from '@/lib/funnel-messages';
import { BOT_SOURCE_OPTIONS, SOURCE_LABELS } from '@/lib/lead-source';

// Lid yig'uvchi Telegram bot webhook (bo'lajak o'quvchilar funnel).
// Xavfsizlik: X-Telegram-Bot-Api-Secret-Token == TELEGRAM_LEAD_WEBHOOK_SECRET.
// Telegramga DOIM 200 (retry oldini olish).

interface TgUser { id: number; username?: string; first_name?: string }
interface TgContact { phone_number: string }
interface TgMessage { message_id: number; from?: TgUser; text?: string; contact?: TgContact }
interface TgCallback { id: string; from: TgUser; message?: { message_id: number }; data?: string }
interface TgUpdate { message?: TgMessage; callback_query?: TgCallback }

const LEVEL_LABELS: Record<string, string> = { senior: 'Senior', middle: 'Middle', junior: 'Junior' };

export async function POST(req: NextRequest) {
  try {
    const expected = process.env.TELEGRAM_LEAD_WEBHOOK_SECRET;
    if (!expected) {
      logger.error('[funnel webhook] TELEGRAM_LEAD_WEBHOOK_SECRET sozlanmagan');
      return NextResponse.json({ error: 'not configured' }, { status: 500 });
    }
    if (req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== expected) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const update = (await req.json().catch(() => ({}))) as TgUpdate;
    await handleUpdate(update).catch(err => logger.error('[funnel webhook] handler xato', err));
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error('[POST /api/webhook/telegram-funnel]', error);
    return NextResponse.json({ ok: true });
  }
}

export async function handleUpdate(update: TgUpdate): Promise<void> {
  if (update.callback_query) await handleCallback(update.callback_query);
  else if (update.message) await handleMessage(update.message);
}

// ─── Session helper ───
async function getSession(chatId: string) {
  return prisma.botSession.upsert({ where: { chatId }, update: {}, create: { chatId } });
}
async function patch(chatId: string, data: Record<string, unknown>) {
  await prisma.botSession.upsert({ where: { chatId }, update: data, create: { chatId, ...data } });
}

// ─── Toza chat: savolni almashtirish ───
type Markup = Parameters<typeof sendMessage>[2];
/** Oldingi bot savolini o'chirib, yangi savol yuboradi va uning id'sini saqlaydi (chat tarixi qisqa qoladi). */
async function ask(chatId: string, text: string, markup?: Markup): Promise<void> {
  const s = await prisma.botSession.findUnique({ where: { chatId }, select: { lastMsgId: true } });
  if (s?.lastMsgId) await deleteMessage(chatId, s.lastMsgId).catch(() => {});
  const res = await sendMessage(chatId, text, markup);
  const mid = (res as { result?: { message_id?: number } })?.result?.message_id ?? null;
  await prisma.botSession.upsert({ where: { chatId }, update: { lastMsgId: mid }, create: { chatId, lastMsgId: mid } });
}
/** Foydalanuvchi xabarini o'chirish (javob berilgach chatni tozalash). */
async function delMsg(chatId: string, messageId?: number): Promise<void> {
  if (messageId) await deleteMessage(chatId, messageId).catch(() => {});
}

// ─── Message (matn/kontakt) ───
async function handleMessage(msg: TgMessage): Promise<void> {
  const from = msg.from;
  if (!from) return;
  const chatId = String(from.id);
  const text = (msg.text || '').trim();

  // Foydalanuvchi javobini o'chiramiz — chat tarixi qisqa qoladi.
  await delMsg(chatId, msg.message_id);

  if (text.startsWith('/start')) {
    await startFlow(chatId, from.id);
    return;
  }

  const s = await getSession(chatId);

  switch (s.step) {
    case 'name': {
      if (!text) { await ask(chatId, askNameText()); return; }
      await patch(chatId, { name: text, step: 'phone' });
      await ask(chatId, askPhoneText(), phoneKeyboard());
      return;
    }
    case 'phone': {
      const raw = msg.contact?.phone_number || text;
      const phone = raw ? normalizePhone(raw) : null;
      if (!phone) { await ask(chatId, invalidPhoneText(), phoneKeyboard()); return; }
      await patch(chatId, { phone: '+' + phone, step: 'subject' });
      // phoneKeyboard one_time_keyboard — reply keyboard o'zi yopiladi.
      await showSubjects(chatId);
      return;
    }
    case 'subject_other': {
      if (!text) { await ask(chatId, askOtherSubjectText()); return; }
      await patch(chatId, { subject: text, step: 'teacher' });
      await showTeachers(chatId);
      return;
    }
    case 'fb_liked': {
      if (text) await updateLead(chatId, { feedbackLiked: text });
      await patch(chatId, { step: 'fb_disliked' });
      await ask(chatId, askFeedbackDislikedText(), skipKeyboard());
      return;
    }
    case 'fb_disliked': {
      if (text) await updateLead(chatId, { feedbackDisliked: text });
      await finish(chatId);
      return;
    }
    default:
      await ask(chatId, 'Boshlash uchun /start bosing.');
  }
}

// ─── Callback (tugmalar) ───
async function handleCallback(cq: TgCallback): Promise<void> {
  const chatId = String(cq.from.id);
  const data = cq.data || '';

  if (data === 'chk') {
    await answerCallbackQuery(cq.id);
    await startFlow(chatId, cq.from.id);
    return;
  }
  if (data === 'restart') {
    await answerCallbackQuery(cq.id);
    await prisma.botSession.update({ where: { chatId }, data: {
      step: 'idle', branchId: null, branchName: null, name: null, phone: null,
      subject: null, teacherName: null, teacherLevel: null, source: null, optionsJson: null, leadId: null,
    } }).catch(() => {});
    await startFlow(chatId, cq.from.id);
    return;
  }

  const s = await getSession(chatId);
  const opts: unknown[] = s.optionsJson ? JSON.parse(s.optionsJson) : [];

  if (data === 'subother') {
    await answerCallbackQuery(cq.id);
    await patch(chatId, { step: 'subject_other' });
    await ask(chatId, askOtherSubjectText());
    return;
  }
  if (data === 'tany') {
    await answerCallbackQuery(cq.id);
    await patch(chatId, { teacherName: null, teacherLevel: null });
    await showSources(chatId);
    return;
  }
  if (data === 'fbskip') {
    await answerCallbackQuery(cq.id);
    if (s.step === 'fb_liked') {
      await patch(chatId, { step: 'fb_disliked' });
      await ask(chatId, askFeedbackDislikedText(), skipKeyboard());
    } else {
      await finish(chatId);
    }
    return;
  }

  if (data.startsWith('pick:')) {
    await answerCallbackQuery(cq.id);
    const i = Number(data.split(':')[1]);
    if (s.step === 'branch') {
      const b = opts[i] as { id: string; name: string } | undefined;
      if (!b) return;
      await patch(chatId, { branchId: b.id, branchName: b.name, step: 'name' });
      await ask(chatId, askNameText());
    } else if (s.step === 'subject') {
      const subj = opts[i] as string | undefined;
      if (!subj) return;
      await patch(chatId, { subject: subj, step: 'teacher' });
      await showTeachers(chatId);
    } else if (s.step === 'teacher') {
      const t = opts[i] as { name: string; level: string | null } | undefined;
      if (!t) return;
      await patch(chatId, { teacherName: t.name, teacherLevel: t.level });
      await showSources(chatId);
    } else if (s.step === 'source') {
      const src = opts[i] as string | undefined;
      await patch(chatId, { source: src || 'other' });
      await createLeadAndProceed(chatId);
    }
    return;
  }

  await answerCallbackQuery(cq.id);
}

// ─── Bosqichlar ───
async function startFlow(chatId: string, userId: number): Promise<void> {
  const member = await isChannelMember(userId);
  if (!member) {
    const channel = process.env.TELEGRAM_LEAD_CHANNEL || '';
    const url = channel.startsWith('@') ? `https://t.me/${channel.slice(1)}` : 'https://t.me/';
    await ask(chatId, membershipText(), membershipKeyboard(url));
    return;
  }
  await showBranches(chatId);
}

async function showBranches(chatId: string): Promise<void> {
  const branches = await prisma.branch.findMany({ orderBy: { createdAt: 'asc' }, select: { id: true, name: true } });
  if (branches.length === 0) {
    // Filial yo'q — to'g'ridan-to'g'ri ism
    await patch(chatId, { branchId: null, branchName: null, step: 'name', optionsJson: null });
    await ask(chatId, askNameText());
    return;
  }
  if (branches.length === 1) {
    await patch(chatId, { branchId: branches[0].id, branchName: branches[0].name, step: 'name', optionsJson: null });
    await ask(chatId, askNameText());
    return;
  }
  await patch(chatId, { step: 'branch', optionsJson: JSON.stringify(branches) });
  await ask(chatId, chooseBranchText(), pickKeyboard(branches.map(b => `🏢 ${b.name}`)));
}

async function showSubjects(chatId: string): Promise<void> {
  const s = await getSession(chatId);
  const teachers = await prisma.user.findMany({
    where: { role: 'teacher', status: 'active', subject: { not: null }, ...(s.branchId ? { branchId: s.branchId } : {}) },
    select: { subject: true },
  });
  const subjects = [...new Set(teachers.map(t => t.subject).filter((x): x is string => !!x))].sort();
  await patch(chatId, { step: 'subject', optionsJson: JSON.stringify(subjects) });
  await ask(chatId, chooseSubjectText(), pickKeyboard(
    subjects.map(x => `📖 ${x}`),
    [{ text: '➕ Boshqa fan', data: 'subother' }],
  ));
}

async function showTeachers(chatId: string): Promise<void> {
  const s = await getSession(chatId);
  const teachers = await prisma.user.findMany({
    where: { role: 'teacher', status: 'active', subject: s.subject, ...(s.branchId ? { branchId: s.branchId } : {}) },
    select: { id: true, name: true, level: true },
    orderBy: { name: 'asc' },
  });
  if (teachers.length === 0) {
    // O'qituvchi yo'q — eslatma to'g'ridan-to'g'ri manba savolining tepasiga qo'shiladi.
    await showSources(chatId, noTeachersText() + '\n\n');
    return;
  }
  await patch(chatId, { step: 'teacher', optionsJson: JSON.stringify(teachers) });
  const labels = teachers.map(t => `👩‍🏫 ${t.name}`);
  await ask(chatId, chooseTeacherText(), pickKeyboard(labels, [{ text: '🤝 Farqi yo’q', data: 'tany' }]));
}

/** "Bizni qayerdan bildingiz?" — manba tanlash. */
async function showSources(chatId: string, prefix = ''): Promise<void> {
  const slugs = BOT_SOURCE_OPTIONS.map(o => o.slug);
  await patch(chatId, { step: 'source', optionsJson: JSON.stringify(slugs) });
  const labels = BOT_SOURCE_OPTIONS.map(o => `${o.emoji} ${o.label}`);
  await ask(chatId, prefix + chooseSourceText(), pickKeyboard(labels));
}

async function createLeadAndProceed(chatId: string): Promise<void> {
  const s = await getSession(chatId);
  const name = s.name || 'Noma’lum';
  const phone = s.phone || '';
  const teacher = s.teacherName
    ? `${s.teacherName}${s.teacherLevel ? ` (${LEVEL_LABELS[s.teacherLevel] || s.teacherLevel})` : ''}`
    : null;
  const src = s.source || 'other';
  const leadId = name.charAt(0).toLowerCase() + Math.random().toString(36).substring(2, 6);
  const note = [
    s.subject ? `Fan: ${s.subject}` : '',
    teacher ? `O'qituvchi: ${teacher}` : '',
    `Manba: ${SOURCE_LABELS[src] || src} (Telegram bot)`,
  ].filter(Boolean).join(' | ');

  const lead = await prisma.lead.create({
    data: {
      leadId, name, phone, source: src, status: 'new',
      branchId: s.branchId || null,
      subject: s.subject || null,
      preferredTeacher: teacher,
      telegramChatId: chatId,
      note,
    },
  });
  await patch(chatId, { leadId: lead.id, step: 'fb_liked' });

  // In-app bildirishnoma (admin panel)
  await createNotification({
    type: 'lead',
    title: 'Yangi ariza (Telegram bot)',
    message: `${name} — ${phone}${s.subject ? ` · ${s.subject}` : ''}${teacher ? ` · ${teacher}` : ''}`,
    link: '/dashboard/admin/leads',
    branchId: s.branchId || null,
  }).catch(() => {});

  // Staff guruhga (agar sozlangan) — to'liq ma'lumot bilan
  await notifyStaff(staffLeadText({
    name, phone, branchName: s.branchName, subject: s.subject, teacher,
    source: SOURCE_LABELS[src] || src, leadId,
  }));

  await ask(chatId, `${submittedText()}\n\n${askFeedbackLikedText()}`, skipKeyboard());
}

async function updateLead(chatId: string, data: Record<string, unknown>): Promise<void> {
  const s = await getSession(chatId);
  if (!s.leadId) return;
  await prisma.lead.update({ where: { id: s.leadId }, data }).catch(() => {});
}

async function finish(chatId: string): Promise<void> {
  const s = await getSession(chatId);
  await patch(chatId, { step: 'done' });
  await ask(chatId, thankYouText(s.name || ''), restartKeyboard());
}
