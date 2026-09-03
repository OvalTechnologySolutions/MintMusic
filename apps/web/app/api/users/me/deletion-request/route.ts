import { NextResponse } from 'next/server';
import { apiAsUser } from '@/lib/server-api';

type DeletionRequest = {
  id: string;
  status: string;
  requestedAt: string;
};

export async function GET() {
  try {
    const data = await apiAsUser<{ request: DeletionRequest | null }>(
      '/v1/users/me/deletion-request'
    );
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load deletion status' },
      { status: 400 }
    );
  }
}

export async function POST() {
  try {
    const data = await apiAsUser<{ request: DeletionRequest }>(
      '/v1/users/me/deletion-request',
      { method: 'POST' }
    );
    return NextResponse.json(data, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to request deletion' },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  try {
    const data = await apiAsUser<{ cancelled: boolean }>(
      '/v1/users/me/deletion-request',
      { method: 'DELETE' }
    );
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to cancel deletion' },
      { status: 400 }
    );
  }
}
