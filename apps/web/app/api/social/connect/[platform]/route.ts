import { NextResponse } from 'next/server';
import { apiAsUser } from '@/lib/server-api';
import type { SocialConnectInitResponse } from '@mintmusic/shared';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const { platform } = await params;
    const data = await apiAsUser<SocialConnectInitResponse>(
      `/v1/social/connect/${platform}`,
      { method: 'POST' }
    );
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Connect failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
