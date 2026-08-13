import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@bcl/ui', '@bcl/auth-client', '@bcl/sdk', '@bcl/types'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
      { protocol: 'https', hostname: 'images.pexels.com' },
    ],
  },
};

export default nextConfig;
