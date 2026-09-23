import type { SaveSongRequest } from '@mintmusic/shared';
import { proxyToApi, readJsonBody } from '@/lib/bff';

export async function POST(request: Request) {
  const body = await readJsonBody<SaveSongRequest>(request);
  return proxyToApi('/v1/library/save', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
