import { NextResponse } from 'next/server';

const IOS_TEAM_ID = process.env.IOS_APP_LINK_TEAM_ID;
const IOS_BUNDLE_ID = process.env.IOS_APP_LINK_BUNDLE_ID || 'com.helloagainlinks.app';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!IOS_TEAM_ID) {
    return NextResponse.json(
      {
        error: 'IOS_APP_LINK_TEAM_ID is not configured',
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }

  return NextResponse.json(
    {
      applinks: {
        apps: [],
        details: [
          {
            appID: `${IOS_TEAM_ID}.${IOS_BUNDLE_ID}`,
            paths: ['/auth/mobile-callback', '/auth/mobile-callback/*'],
          },
        ],
      },
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
      },
    }
  );
}
