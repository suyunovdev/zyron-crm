import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-utils';
import { getChildrenReport } from '@/lib/parent-report';

// Parent's children — with groups, attendance, payments, balance, rankings.
// Logika `@/lib/parent-report` da (Telegram bot ham shundan foydalanadi — yagona manba).
export async function GET() {
  const auth = await requireAuth('parent');
  if (auth instanceof NextResponse) return auth;

  const enriched = await getChildrenReport(auth.id);
  return NextResponse.json(enriched);
}
