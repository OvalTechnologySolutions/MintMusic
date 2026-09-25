import { proxyToApi } from '@/lib/bff';

export async function POST() {
  return proxyToApi('/v1/artist/subscription/cancel', { method: 'POST' });
}
