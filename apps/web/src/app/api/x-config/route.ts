import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, isAuthError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// In-memory store for crowdsourced X GraphQL query_id.
// Multiple extension users report their captured query_id; we serve the most recent.
// This is volatile (lost on server restart) which is fine — extensions re-report frequently
// and have a runtime fallback to capture query_id directly from X.com page loads.
interface XConfigEntry {
  queryId: string;
  features: string;
  reportedAt: number;
  reportCount: number;
}

let currentConfig: XConfigEntry | null = null;

// GET: Return the current known query_id and features
export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  if (!currentConfig) {
    return NextResponse.json({ queryId: null, features: null, updatedAt: null });
  }

  return NextResponse.json({
    queryId: currentConfig.queryId,
    features: currentConfig.features,
    updatedAt: currentConfig.reportedAt,
    reportCount: currentConfig.reportCount,
  });
}

// POST: Report a captured query_id from the extension
export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  try {
    const body = await req.json();
    const { queryId, features } = body;

    if (!queryId || typeof queryId !== 'string') {
      return NextResponse.json({ error: 'queryId is required' }, { status: 400 });
    }

    if (currentConfig && currentConfig.queryId === queryId) {
      // Same query_id — just bump the count
      currentConfig.reportCount++;
      currentConfig.reportedAt = Date.now();
    } else {
      // New query_id — replace
      currentConfig = {
        queryId,
        features: features || '',
        reportedAt: Date.now(),
        reportCount: 1,
      };
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
