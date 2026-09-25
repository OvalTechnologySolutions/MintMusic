import { proxyToApi, readJsonBody } from '@/lib/bff';

export async function POST(request: Request) {
  const body = await readJsonBody<{ deviceId: string }>(request);
  return proxyToApi('/v1/offline/lease', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
