import { redirect } from 'next/navigation';

// Superadmin roli /dashboard/admin marshrutidan foydalanadi (alohida superadmin
// sahifasi yo'q). Har qanday /dashboard/superadmin[/...] ni /dashboard/admin[/...]
// ga xavfsiz yo'naltiramiz — role-nomiga asoslangan havola xatolarining oldini oladi.
export default async function SuperadminRedirect({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const rest = slug?.length ? '/' + slug.join('/') : '';
  redirect('/dashboard/admin' + rest);
}
