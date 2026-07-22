import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-utils';
import { getSettings, setSettings, SETTING_DEFAULTS } from '@/lib/settings';
import { logAudit } from '@/lib/audit';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const auth = await requireAuth('superadmin');
    if (auth instanceof NextResponse) return auth;
    return NextResponse.json(await getSettings());
  } catch (error) {
    logger.error('[GET /api/superadmin/settings]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth('superadmin');
    if (auth instanceof NextResponse) return auth;

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON noto\'g\'ri' }, { status: 400 }); }

    // Faqat ma'lum kalitlarni qabul qilamiz
    const allowed: Record<string, string> = {};
    for (const key of Object.keys(SETTING_DEFAULTS)) {
      if (body[key] !== undefined) allowed[key] = String(body[key]);
    }
    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: 'O\'zgartirish uchun sozlama yo\'q' }, { status: 400 });
    }

    await setSettings(allowed);
    await logAudit(auth, 'update', 'setting', null, `Sozlamalar: ${Object.keys(allowed).join(', ')}`);
    return NextResponse.json(await getSettings());
  } catch (error) {
    logger.error('[PATCH /api/superadmin/settings]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
