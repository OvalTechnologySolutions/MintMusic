import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { proxyToApi, readJsonBody } from '@/lib/bff';

type Ctx = { params: Promise<{ path?: string[] }> };

function buildPath(parts: string[] | undefined, search: string): string {
  const base = `/v1/cratebuilder/${(parts ?? []).join('/')}`;
  return search ? `${base}${search}` : base;
}

export async function GET(request: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { path } = await ctx.params;
  const url = new URL(request.url);
  return proxyToApi(buildPath(path, url.search));
}

export async function POST(request: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { path } = await ctx.params;
  const body = await readJsonBody<unknown>(request).catch(() => ({}));
  return proxyToApi(buildPath(path, ''), {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { path } = await ctx.params;
  const body = await readJsonBody<unknown>(request).catch(() => ({}));
  return proxyToApi(buildPath(path, ''), {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}
