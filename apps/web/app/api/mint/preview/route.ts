import type { CreateMintCheckoutRequest } from '@mintmusic/shared';
import { proxyToApi, readJsonBody } from '@/lib/bff';

export async function POST(request: Request) {
  const body = await readJsonBody<{ amountCents: number }>(request);
  return proxyToApi('/v1/mint/preview', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
