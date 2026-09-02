import { NextResponse } from 'next/server';
import { webConfig } from '@/lib/config';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const res = await fetch(
    `${webConfig.apiUrl.replace(/\/$/, '')}/v1/users/${userId}/public`,
    { cache: 'no-store' }
  );
  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json({ error: data.error ?? 'Not found' }, { status: res.status });
  }
  return NextResponse.json(data);
}
