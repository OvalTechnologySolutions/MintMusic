import { proxyToApi, readJsonBody } from '@/lib/bff';
import type { TasteOAuthCallbackRequest } from '@mintmusic/shared';

export async function POST(request: Request) {
  const body = await readJsonBody<TasteOAuthCallbackRequest>(request);
  return proxyToApi('/v1/taste/callback', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
