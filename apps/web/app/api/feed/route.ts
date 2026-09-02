import { proxyToApi } from '@/lib/bff';

export async function GET(request: Request) {
  const qs = new URL(request.url).searchParams.toString();
  return proxyToApi(`/v1/feed${qs ? `?${qs}` : ''}`);
}
