import { proxyToApi, readJsonBody } from '@/lib/bff';

export async function POST(request: Request) {
  const body = await readJsonBody<{ returnUrl?: string }>(request);
  return proxyToApi('/v1/artist/subscription/portal', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
