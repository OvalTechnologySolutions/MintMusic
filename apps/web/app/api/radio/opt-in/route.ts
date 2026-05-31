import { proxyToApi, readJsonBody } from '@/lib/bff';
import type { RadioOptInRequest } from '@mintmusic/shared';

export async function POST(request: Request) {
  const body = await readJsonBody<RadioOptInRequest>(request);
  return proxyToApi('/v1/radio/opt-in', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
