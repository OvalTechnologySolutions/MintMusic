import { proxyToApi } from '@/lib/bff';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  const { creatorId } = await params;
  return proxyToApi(`/v1/feed/follow/${creatorId}`, { method: 'POST' });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  const { creatorId } = await params;
  return proxyToApi(`/v1/feed/follow/${creatorId}`, { method: 'DELETE' });
}
