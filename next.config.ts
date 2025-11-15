import type { NextConfig } from 'next';
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: false,
});

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  reactStrictMode: true,
  productionBrowserSourceMaps: true,
  images: {
    remotePatterns: [],
  },
  webpack: (config) => {
    // Reduce noisy dev warnings about large string serialization in cache
    // without affecting runtime logging.
    (config as any).infrastructureLogging = { level: 'error' };
    return config;
  },
};

export default withBundleAnalyzer(nextConfig);
