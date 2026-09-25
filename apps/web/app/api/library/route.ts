import { proxyToApi } from '@/lib/bff';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get('includeHidden') === '1' ? '?includeHidden=1' : '';
  return proxyToApi(`/v1/library${q}`);
}
