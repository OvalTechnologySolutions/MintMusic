import { proxyToApi, readJsonBody } from '@/lib/bff';
import type { RecordPlayRequest } from '@mintmusic/shared';

export async function POST(request: Request) {
  const body = await readJsonBody<RecordPlayRequest>(request);
  return proxyToApi('/v1/collection/plays', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
