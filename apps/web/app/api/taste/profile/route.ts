import { proxyToApi } from '@/lib/bff';

export async function GET() {
  return proxyToApi('/v1/taste/profile');
}
