import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@helloagain/shared', '@helloagain/ui'],
};

export default nextConfig;
