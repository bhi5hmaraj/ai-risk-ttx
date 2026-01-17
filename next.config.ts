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
  output: 'standalone',
  reactStrictMode: true,
  productionBrowserSourceMaps: true,
  images: {
    remotePatterns: [],
  },
  webpack: (config) => {
    // Reduce noisy dev warnings about large string serialization in cache
    // without affecting runtime logging.
    (config as any).infrastructureLogging = { level: 'error' };

    // Suppress OpenTelemetry dynamic require warnings from Sentry instrumentation
    // This is safe because the logger has try/catch for optional Sentry integration
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      /Critical dependency: require function is used in a way in which dependencies cannot be statically extracted/,
    ];

    return config;
  },
};

export default withBundleAnalyzer(nextConfig);
