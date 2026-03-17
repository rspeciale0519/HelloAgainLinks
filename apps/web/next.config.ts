import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@helloagain/shared', '@helloagain/ui'],
  output: process.env.BUILD_TARGET === 'mobile' ? 'export' : undefined,
};

export default nextConfig;
