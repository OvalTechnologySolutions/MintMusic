import { proxyToApi } from '@/lib/bff';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ releaseId: string }> }
) {
  const { releaseId } = await params;
  return proxyToApi(`/v1/collection/check/${releaseId}`);
}
