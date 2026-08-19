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
  ];
  if (hasSiblings) rows.push([{ text: '◀️ Farzandlar', callback_data: 'back' }]);
  return { inline_keyboard: rows };
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
