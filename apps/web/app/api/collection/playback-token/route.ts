import { proxyToApi, readJsonBody } from '@/lib/bff';
import type { PlaybackTokenRequest } from '@mintmusic/shared';

export async function POST(request: Request) {
  const body = await readJsonBody<PlaybackTokenRequest>(request);
  return proxyToApi('/v1/collection/playback-token', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
