import { proxyToApi } from '@/lib/bff';

export async function POST() {
  return proxyToApi('/v1/offline/revoke', { method: 'POST' });
}
