import { proxyToApi, readJsonBody } from '@/lib/bff';
import type { UploadIntentRequest } from '@mintmusic/shared';

export async function POST(request: Request) {
  const body = await readJsonBody<UploadIntentRequest>(request);
  return proxyToApi('/v1/media/upload-intent', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
