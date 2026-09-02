import type { CreateReleaseCheckoutRequest } from '@mintmusic/shared';
import { proxyToApi, readJsonBody } from '@/lib/bff';

export async function POST(request: Request) {
  const body = await readJsonBody<CreateReleaseCheckoutRequest>(request);
  return proxyToApi('/v1/stripe/checkout/release', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
