// Stub module used during mobile static export builds.
// API routes are replaced with this no-op so the build succeeds.
// The mobile app calls the live Vercel API; these stubs are never executed.
export const dynamic = 'force-static';
export const dynamicParams = false;
export function generateStaticParams() {
  return [];
}
export function GET() {
  return new Response(null, { status: 204 });
}
