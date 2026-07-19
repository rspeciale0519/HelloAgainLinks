import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const protectedRoutes = ['/dashboard'];
const publicRoutes = ['/', '/login', '/api', '/auth', '/lists'];

const APP_ORIGIN_PATTERN = /^(capacitor|ionic):\/\/localhost$|^https?:\/\/localhost(:\d+)?$/;

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // CORS for the native mobile app calling our API cross-origin. The Capacitor
  // WebView runs at capacitor://localhost (iOS) or http(s)://localhost (Android),
  // so every /api request is cross-origin; without CORS the WebView blocks the
  // POST after the preflight (login handoff, bookmarks, tags all fail). These
  // endpoints stay auth-protected (Bearer token / handoff nonce), so reflecting
  // the fixed app origins is safe.
  if (pathname.startsWith('/api/')) {
    const origin = req.headers.get('origin');
    if (origin && APP_ORIGIN_PATTERN.test(origin)) {
      const corsHeaders: Record<string, string> = {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
        Vary: 'Origin',
      };
      if (req.method === 'OPTIONS') {
        return new NextResponse(null, { status: 204, headers: corsHeaders });
      }
      const response = NextResponse.next();
      for (const [key, value] of Object.entries(corsHeaders)) {
        response.headers.set(key, value);
      }
      return response;
    }
    return NextResponse.next();
  }

  // Mobile routes are native-app only — redirect web browsers to dashboard
  if (pathname === '/mobile' || pathname.startsWith('/mobile/')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Skip public routes and API routes
  if (publicRoutes.some(r => pathname === r || pathname.startsWith(r + '/'))) {
    return NextResponse.next();
  }

  // Check if this is a protected route
  if (!protectedRoutes.some(r => pathname === r || pathname.startsWith(r + '/'))) {
    return NextResponse.next();
  }

  // Check for Supabase session via cookies
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Try to get session from cookies or authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (user) return NextResponse.next();
  }

  // Check for sb-* cookies (Supabase stores session in cookies)
  const cookies = req.cookies.getAll();
  const hasSession = cookies.some(c =>
    c.name.includes('sb-') && c.name.includes('auth-token')
  );

  if (hasSession) {
    return NextResponse.next();
  }

  // No session found — but let the client-side handle the redirect
  // because the session might be in localStorage (Supabase default)
  // Only redirect if there's clearly no auth at all
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/mobile/:path*', '/mobile', '/api/:path*'],
};
