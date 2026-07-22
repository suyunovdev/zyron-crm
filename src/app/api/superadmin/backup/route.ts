import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { requireAuth } from '@/lib/api-utils';
import { logAudit } from '@/lib/audit';
import { logger } from '@/lib/logger';

// SQLite bazasidan zaxira nusxa yaratish (fayl nusxasi).
// Postgres'da bu pg_dump talab qiladi — bu endpoint faqat file: bazada ishlaydi.
export async function POST() {
  try {
    const auth = await requireAuth('superadmin');
    if (auth instanceof NextResponse) return auth;

    const url = process.env.DATABASE_URL || '';
    if (!url.startsWith('file:')) {
      return NextResponse.json({ error: 'Backup faqat SQLite (file:) uchun. Postgres\'da server backup\'idan foydalaning.' }, { status: 400 });
    }

    const rel = url.replace('file:', '');
    const dbPath = path.resolve(process.cwd(), 'prisma', rel.replace(/^\.\//, ''));
    const backupDir = path.resolve(process.cwd(), 'backups');
    await fs.mkdir(backupDir, { recursive: true });

    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const dest = path.join(backupDir, `backup_${ts}.db`);
    await fs.copyFile(dbPath, dest);
    // WAL fayl bo'lsa uni ham (yaqinda commit qilinmagan ma'lumot uchun)
    try { await fs.copyFile(dbPath + '-wal', dest + '-wal'); } catch { /* wal yo'q */ }

    await logAudit(auth, 'backup', 'system', null, `Zaxira yaratildi: ${path.basename(dest)}`);
    return NextResponse.json({ ok: true, file: path.basename(dest) });
  } catch (error) {
    logger.error('[POST /api/superadmin/backup]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
