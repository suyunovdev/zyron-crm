import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-utils';
import { getSettings, setSettings, SETTING_DEFAULTS } from '@/lib/settings';
import { logAudit } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { HEX_COLOR_RE } from '@/lib/brand';

// Logo — client'da ≤512px PNG'ga siqiladi; avatar bilan bir xil chegara.
const MAX_LOGO_LEN = 500_000;
const LOGO_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

/** Brend kalitlarini tekshiradi; xato matni yoki null. */
function validateBrand(v: Record<string, string>): { error: string; status: number } | null {
  if (v.brandName !== undefined) {
    v.brandName = v.brandName.trim().replace(/\s+/g, ' ');
    if (v.brandName && (v.brandName.length < 2 || v.brandName.length > 80)) {
      return { error: 'Markaz nomi 2–80 belgi bo\'lishi kerak', status: 400 };
    }
  }
  if (v.brandColor !== undefined && v.brandColor !== '' && !HEX_COLOR_RE.test(v.brandColor)) {
    return { error: 'Rang formati noto\'g\'ri (#RRGGBB)', status: 400 };
  }
  if (v.brandLogo !== undefined && v.brandLogo !== '') {
    if (v.brandLogo.length > MAX_LOGO_LEN) return { error: 'Logo juda katta', status: 413 };
    if (!LOGO_RE.test(v.brandLogo)) return { error: 'Logo formati noto\'g\'ri (PNG/JPEG/WebP)', status: 400 };
  }
  return null;
}

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

    const invalid = validateBrand(allowed);
    if (invalid) return NextResponse.json({ error: invalid.error }, { status: invalid.status });

    await setSettings(allowed);
    await logAudit(auth, 'update', 'setting', null, `Sozlamalar: ${Object.keys(allowed).join(', ')}`);
    return NextResponse.json(await getSettings());
  } catch (error) {
    logger.error('[PATCH /api/superadmin/settings]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
