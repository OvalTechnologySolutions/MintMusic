import { NextResponse } from 'next/server';
import { apiAsUser } from '@/lib/server-api';
import type { StripeConnectStatusResponse } from '@mintmusic/shared';

export async function GET() {
  try {
    const data = await apiAsUser<StripeConnectStatusResponse>(
      '/v1/stripe/connect/status'
    );
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Status check failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
