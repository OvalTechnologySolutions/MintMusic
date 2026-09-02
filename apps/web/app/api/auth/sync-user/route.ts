import { NextResponse } from 'next/server';
import type { OAuthSyncRequest, OAuthSyncResponse } from '@mintmusic/shared';
import { webConfig } from '@/lib/config';

/** Server-side bridge: NextAuth → MintMusic API user upsert */
export async function POST(request: Request) {
  const body = (await request.json()) as OAuthSyncRequest;

  const apiBase = webConfig.apiUrl.replace(/\/$/, '');
  const res = await fetch(`${apiBase}/v1/auth/oauth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error('[sync-user]', res.status, data);
    return NextResponse.json(
      { error: data.error ?? 'Failed to sync user with API' },
      { status: res.status }
    );
  }

  return NextResponse.json(data as OAuthSyncResponse);
}
