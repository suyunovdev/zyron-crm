import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-utils';
import { computeStudentBalance } from '@/lib/billing';

export async function GET() {
  const auth = await requireAuth('student');
  if (auth instanceof NextResponse) return auth;

  // Yagona billing manbasi — admin/stats bilan bir xil formula
  const result = await computeStudentBalance(auth.id);
  return NextResponse.json(result);
}
