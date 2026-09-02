import { proxyToApi, readJsonBody } from '@/lib/bff';
import type { CreateReleaseRequest } from '@mintmusic/shared';

export async function POST(request: Request) {
  const body = await readJsonBody<CreateReleaseRequest>(request);
  return proxyToApi('/v1/catalog/releases', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
