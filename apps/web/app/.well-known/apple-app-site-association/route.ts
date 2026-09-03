import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET() {
  const teamId = process.env.APPLE_DEVELOPER_TEAM_ID;
  if (!teamId) {
    return NextResponse.json(
      { error: 'APPLE_DEVELOPER_TEAM_ID is not configured' },
      { status: 503 }
    );
  }

  const appId = `${teamId}.ai.mintmusic.app`;
  return NextResponse.json(
    {
      applinks: {
        apps: [],
        details: [
          {
            appID: appId,
            components: [
              { '/': '/collector*', comment: 'Owned collection routes' },
              { '/': '/discover*', comment: 'Discovery routes' },
              { '/': '/u/*', comment: 'Public creator profiles' },
              { '/': '/settings*', comment: 'Account settings' },
            ],
          },
        ],
      },
      webcredentials: {
        apps: [appId],
      },
    },
    { headers: { 'Cache-Control': 'public, max-age=3600' } }
  );
}
