import { redirect } from 'next/navigation';
import { getSession, getDashboardPath } from '@/lib/auth';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  // getDashboardPath superadmin'ni /dashboard/admin ga xaritalaydi (superadmin sahifasi yo'q)
  redirect(getDashboardPath(session.role));
}
