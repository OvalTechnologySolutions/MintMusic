import { NextResponse } from 'next/server';
import { apiPublic } from '@/lib/server-api';

export async function GET(request: Request) {
  const qs = new URL(request.url).searchParams.toString();
  try {
    const data = await apiPublic(`/v1/discover/store${qs ? `?${qs}` : ''}`);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Request failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
