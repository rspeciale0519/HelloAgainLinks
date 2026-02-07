import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const protectedRoutes = ['/dashboard'];
const publicRoutes = ['/', '/login', '/api', '/auth', '/lists'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

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
  matcher: ['/dashboard/:path*'],
};
