import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET() {
  const fingerprints = (process.env.ANDROID_APP_SHA256_CERT_FINGERPRINTS ?? '')
    .split(',')
    .map((fingerprint) => fingerprint.trim())
    .filter(Boolean);

  if (fingerprints.length === 0) {
    return NextResponse.json(
      { error: 'ANDROID_APP_SHA256_CERT_FINGERPRINTS is not configured' },
      { status: 503 }
    );
  }

  return NextResponse.json(
    [
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: 'ai.mintmusic.app',
          sha256_cert_fingerprints: fingerprints,
        },
      },
    ],
    { headers: { 'Cache-Control': 'public, max-age=3600' } }
  );
}
