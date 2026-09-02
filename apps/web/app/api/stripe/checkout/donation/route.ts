import { NextResponse } from 'next/server';
import { webConfig } from '@/lib/config';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await fetch(
      `${webConfig.apiUrl.replace(/\/$/, '')}/v1/stripe/checkout/donation`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data.error ?? 'Checkout failed' }, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Checkout failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
