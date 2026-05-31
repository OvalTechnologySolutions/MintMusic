import { NextResponse } from 'next/server';
import { apiAsUser } from '@/lib/server-api';
import type { CreatorApplication } from '@mintmusic/shared';

export async function GET() {
  try {
    const data = await apiAsUser<{ application: CreatorApplication | null }>(
      '/v1/creator-applications/me'
    );
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unauthorized';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = await apiAsUser<{ application: CreatorApplication }>(
      '/v1/creator-applications',
      { method: 'POST', body: JSON.stringify(body) }
    );
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Submission failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
