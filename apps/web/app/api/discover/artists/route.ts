import { NextResponse } from 'next/server';
import { proxyToApi } from '@/lib/bff';

/** Public discovery allowlist — no contacts. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  try {
    const { apiPublic } = await import('@/lib/server-api');
    const data = await apiPublic(`/v1/discover/artists${url.search}`);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Request failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
