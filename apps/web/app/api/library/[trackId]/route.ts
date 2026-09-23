import { proxyToApi } from '@/lib/bff';

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ trackId: string }> }
) {
  const { trackId } = await ctx.params;
  return proxyToApi(`/v1/library/${encodeURIComponent(trackId)}`, {
    method: 'DELETE',
  });
}

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ trackId: string }> }
) {
  const { trackId } = await ctx.params;
  return proxyToApi(`/v1/library/${encodeURIComponent(trackId)}/restore`, {
    method: 'POST',
  });
}
