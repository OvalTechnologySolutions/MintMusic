import 'server-only';
import { auth } from '@/auth';
import { webConfig } from './config';

export async function apiAsUser<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) {
    throw new Error('INTERNAL_API_SECRET is not configured');
  }

  const res = await fetch(`${webConfig.apiUrl.replace(/\/$/, '')}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Secret': secret,
      'X-User-Id': session.user.id,
      ...init?.headers,
    },
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? res.statusText);
  }
  return data as T;
}
