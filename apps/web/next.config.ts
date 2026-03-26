import type { NextConfig } from 'next';

const isMobile = process.env.BUILD_TARGET === 'mobile';

const nextConfig: NextConfig = {
  transpilePackages: ['@helloagain/shared', '@helloagain/ui'],
  output: isMobile ? 'export' : undefined,
  trailingSlash: isMobile ? true : undefined,
  images: isMobile ? { unoptimized: true } : undefined,
};

export default nextConfig;
