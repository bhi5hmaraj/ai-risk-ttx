import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Enable React strict mode for better error detection
  reactStrictMode: true,
  // Optimize images (if using next/image)
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
