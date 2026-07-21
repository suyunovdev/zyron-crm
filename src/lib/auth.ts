import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'aka-uka-talim-markazi-secret-key-2024'
);

export interface SessionUser {
  id: string;
  login: string;
  name: string;
  role: 'admin' | 'teacher' | 'student';
}

export async function createToken(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function getDashboardPath(role: string): string {
  switch (role) {
    case 'admin': return '/dashboard/admin';
    case 'teacher': return '/dashboard/teacher';
    case 'student': return '/dashboard/student';
    default: return '/login';
  }
}
