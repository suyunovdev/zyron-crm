import { NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * So'rov body'sini zod sxema bo'yicha tekshiradi.
 * Muvaffaqiyatsiz bo'lsa 400 (NextResponse) qaytaradi, aks holda tipli data.
 *
 * Foydalanish:
 *   const parsed = await parseBody(req, LoginSchema);
 *   if (parsed instanceof NextResponse) return parsed;
 *   const { login, password } = parsed;
 */
export async function parseBody<T extends z.ZodTypeAny>(
  req: Request,
  schema: T,
): Promise<z.infer<T> | NextResponse> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON body noto\'g\'ri' }, { status: 400 });
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    const field = first?.path.join('.') || 'input';
    return NextResponse.json(
      { error: `Noto'g'ri ma'lumot: ${field} — ${first?.message || 'validatsiya xatosi'}` },
      { status: 400 },
    );
  }
  return result.data;
}
