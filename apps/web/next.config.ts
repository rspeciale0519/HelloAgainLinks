import type { NextConfig } from 'next';
import { SECURITY_HEADERS } from './src/lib/security-headers';

const isMobile = process.env.BUILD_TARGET === 'mobile';

const nextConfig: NextConfig = {
  transpilePackages: ['@helloagain/shared', '@helloagain/ui', '@helloagain/ui-hal'],
  output: isMobile ? 'export' : undefined,
  trailingSlash: isMobile ? true : undefined,
  images: isMobile ? { unoptimized: true } : undefined,
  async headers() {
    if (isMobile) return [];
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
