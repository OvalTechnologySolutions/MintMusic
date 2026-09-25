import type { CreateMintCheckoutRequest } from '@mintmusic/shared';
import { proxyToApi, readJsonBody } from '@/lib/bff';

export async function POST(request: Request) {
  const body = await readJsonBody<CreateMintCheckoutRequest>(request);
  return proxyToApi('/v1/mint/checkout', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
