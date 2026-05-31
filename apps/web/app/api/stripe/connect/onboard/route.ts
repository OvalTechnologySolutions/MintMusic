import { NextResponse } from 'next/server';
import { apiAsUser } from '@/lib/server-api';

export async function POST() {
  try {
    const data = await apiAsUser<{ url: string }>('/v1/stripe/connect/onboard', {
      method: 'POST',
    });
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Onboarding failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
