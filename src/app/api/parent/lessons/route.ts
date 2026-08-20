import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-utils';
import { getChildLessons } from '@/lib/parent-report';
import { logger } from '@/lib/logger';

// Ota-ona uchun farzandning BARCHA o'tilgan mavzulari (oylik filter — client tomonda).
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth('parent');
    if (auth instanceof NextResponse) return auth;

    const childId = new URL(req.url).searchParams.get('childId');
    if (!childId) return NextResponse.json({ error: 'childId majburiy' }, { status: 400 });

    const data = await getChildLessons(auth.id, childId); // egalik ichida tekshiriladi
    return NextResponse.json(data);
  } catch (error) {
    logger.error('[GET /api/parent/lessons]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
