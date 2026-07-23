import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-utils';
import { computeTeacherSalary } from '@/lib/payroll';
import { getSetting } from '@/lib/settings';
import { logger } from '@/lib/logger';

// Ustoz o'z maoshini ko'radi (oy + kunlik taqsimot)
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth('teacher');
    if (auth instanceof NextResponse) return auth;

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const month = new URL(req.url).searchParams.get('month') || currentMonth;

    const defaultShare = parseInt(await getSetting('defaultSalaryShare')) || 0;
    const detail = await computeTeacherSalary(auth.id, month, defaultShare);
    if (!detail) return NextResponse.json({ error: 'Topilmadi' }, { status: 404 });

    return NextResponse.json(detail);
  } catch (error) {
    logger.error('[GET /api/teacher/salary]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
