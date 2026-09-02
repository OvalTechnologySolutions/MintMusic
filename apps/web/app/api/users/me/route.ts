import { NextResponse } from 'next/server';
import { apiAsUser } from '@/lib/server-api';
import type { User } from '@mintmusic/shared';

export async function GET() {
  try {
    const data = await apiAsUser<{ user: User }>('/v1/users/me');
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unauthorized';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const data = await apiAsUser<{ user: User }>('/v1/users/me', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Update failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
