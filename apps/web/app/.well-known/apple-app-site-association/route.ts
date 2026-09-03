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
        // Current AASA format: `appIDs` + `components` (not the legacy
        // `appID` + `paths`). The record player is the whole product at `/`,
        // so all in-scope paths open the app.
        details: [
          {
            appIDs: [appId],
            components: [{ '/': '/*', comment: 'MintMusic app routes' }],
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
