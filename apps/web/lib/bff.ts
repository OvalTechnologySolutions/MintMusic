import { NextResponse } from 'next/server';
import { apiAsUser } from './server-api';

function errorStatus(message: string): number {
  if (message === 'Unauthorized') return 401;
  if (message.includes('not found') || message.includes('Not found')) return 404;
  if (message.includes('already own')) return 409;
  return 400;
}

/** Authenticated BFF proxy to the MintMusic API */
export async function proxyToApi<T>(
  path: string,
  init?: RequestInit
): Promise<NextResponse> {
  try {
    const data = await apiAsUser<T>(path, init);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Request failed';
    return NextResponse.json({ error: message }, { status: errorStatus(message) });
  }
}

export async function readJsonBody<T>(request: Request): Promise<T> {
  return request.json() as Promise<T>;
}
