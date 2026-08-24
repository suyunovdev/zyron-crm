import { escapeHtml } from '@/lib/telegram';
import type { InlineKeyboard } from '@/lib/telegram';
import type { ReplyKeyboard, RemoveKeyboard } from '@/lib/telegram-funnel';
import { BRAND_SHORT } from '@/lib/brand';

// Lid-bot xabar matnlari (o'zbekcha) + keyboardlar — sof funksiyalar.

// ─── Keyboardlar ───

/** Umumiy tanlov klaviaturasi — har variant alohida qator (pick:<index>) + ixtiyoriy qo'shimcha tugmalar. */
export function pickKeyboard(labels: string[], extra: { text: string; data: string }[] = []): InlineKeyboard {
  const rows = labels.map((l, i) => [{ text: l, callback_data: `pick:${i}` }]);
  for (const e of extra) rows.push([{ text: e.text, callback_data: e.data }]);
  return { inline_keyboard: rows };
}

/** Kanalga a'zolik — kanal tugmasi + "A'zo bo'ldim" qayta tekshirish. */
export function membershipKeyboard(channelUrl: string): InlineKeyboard {
  return {
    inline_keyboard: [
      [{ text: '📢 Kanalga o’tish', url: channelUrl }],
      [{ text: '✅ A’zo bo’ldim', callback_data: 'chk' }],
    ],
  };
}

/** Telefon so'rash — request_contact reply keyboard. */
export function phoneKeyboard(): ReplyKeyboard {
  return {
    keyboard: [[{ text: '📱 Telefon raqamni yuborish', request_contact: true }]],
    resize_keyboard: true,
    one_time_keyboard: true,
  };
}

export function removeKeyboard(): RemoveKeyboard {
  return { remove_keyboard: true };
}

/** Feedback o'tkazib yuborish. */
export function skipKeyboard(): InlineKeyboard {
  return { inline_keyboard: [[{ text: '⏭ O’tkazib yuborish', callback_data: 'fbskip' }]] };
}

/** Tashakkurdan keyin — yangi ariza. */
export function restartKeyboard(): InlineKeyboard {
  return { inline_keyboard: [[{ text: '🔄 Yangi ariza', callback_data: 'restart' }]] };
}

// ─── Matnlar ───

export function membershipText(): string {
  return (
    `Assalomu alaykum! 👋\n\n` +
    `<b>${escapeHtml(BRAND_SHORT)}</b> o’quv markazi botiga xush kelibsiz.\n\n` +
    `Davom etish uchun avval rasmiy kanalimizga a’zo bo’ling 👇, so’ng ` +
    `«✅ A’zo bo’ldim» tugmasini bosing.`
  );
}

export function chooseBranchText(): string {
  return `🏢 Qaysi filialimizda o’qimoqchisiz?`;
}

export function askNameText(): string {
  return `✍️ Ism va familiyangizni kiriting:`;
}

export function askPhoneText(): string {
  return (
    `📞 Telefon raqamingizni yuboring.\n\n` +
    `Pastdagi «📱 Telefon raqamni yuborish» tugmasini bosing yoki qo’lda yozing ` +
    `(masalan: +998 90 123 45 67).`
  );
}

export function invalidPhoneText(): string {
  return `❌ Raqam noto’g’ri. Iltimos, to’g’ri O’zbekiston raqamini kiriting (masalan +998901234567).`;
}

export function chooseSubjectText(): string {
  return `📚 Qaysi fandan o’qimoqchisiz?`;
}

export function askOtherSubjectText(): string {
  return `✍️ Qaysi fan? Yozib yuboring:`;
}

export function noTeachersText(): string {
  return `Bu fan bo’yicha hozircha o’qituvchi biriktirilmagan, lekin arizangiz qabul qilinadi.`;
}

export function chooseTeacherText(): string {
  return `👩‍🏫 O’zingizga ma’qul o’qituvchini tanlang (daraja ko’rsatilgan):`;
}

export function chooseSourceText(): string {
  return `📣 Bizni qayerdan bildingiz?`;
}

export function askFeedbackLikedText(): string {
  return `💬 O’quv markazimizning yoqqan tomonlari nimalar? 🙂\n\n(yozing yoki o’tkazib yuboring)`;
}

export function askFeedbackDislikedText(): string {
  return `📝 Yoqmagan tomonlari yoki takliflaringiz bormi?\n\n(yozing yoki o’tkazib yuboring)`;
}

export function submittedText(): string {
  return `✅ Arizangiz qabul qilindi!`;
}

export function thankYouText(name: string): string {
  const who = name ? `, <b>${escapeHtml(name.split(' ')[0])}</b>` : '';
  return (
    `Rahmat${who}! 🙌\n\n` +
    `Arizangiz qabul qilindi. Tez orada administratorlarimiz siz bilan bog’lanadi.\n\n` +
    `Bizni tanlaganingiz uchun tashakkur! 💙`
  );
}

/** Staff guruhga yangi ariza xabari. */
export function staffLeadText(d: {
  name: string; phone: string; branchName?: string | null; subject?: string | null; teacher?: string | null;
}): string {
  const lines = [
    `🆕 <b>Yangi ariza</b> (Telegram bot)`,
    `👤 ${escapeHtml(d.name)}`,
    `📞 ${escapeHtml(d.phone)}`,
  ];
  if (d.branchName) lines.push(`🏢 ${escapeHtml(d.branchName)}`);
  if (d.subject) lines.push(`📚 ${escapeHtml(d.subject)}`);
  if (d.teacher) lines.push(`👩‍🏫 ${escapeHtml(d.teacher)}`);
  return lines.join('\n');
}
