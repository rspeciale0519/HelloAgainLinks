import { NextResponse } from 'next/server';

const ANDROID_APP_LINK_PACKAGE_NAME =
  process.env.ANDROID_APP_LINK_PACKAGE_NAME || 'com.helloagainlinks.app';

function parseFingerprints(value: string | undefined) {
  return (value || '')
    .split(/[\r\n,]+/)
    .map((fingerprint) => fingerprint.trim())
    .filter(Boolean);
}

export const dynamic = 'force-dynamic';

export async function GET() {
  const fingerprints = parseFingerprints(process.env.ANDROID_APP_LINK_SHA256_FINGERPRINTS);
  if (!fingerprints.length) {
    return NextResponse.json(
      {
        error: 'ANDROID_APP_LINK_SHA256_FINGERPRINTS is not configured',
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
    [
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: ANDROID_APP_LINK_PACKAGE_NAME,
          sha256_cert_fingerprints: fingerprints,
        },
      },
    ],
    {
      headers: {
        'Cache-Control': 'public, max-age=300',
      },
    }
  );
}
