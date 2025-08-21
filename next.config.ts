/** @type {import('next').NextConfig} */

const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  
  // Webpack configuration for Windows compatibility
  webpack: (config: any, { dev, isServer }: any) => {
    // Reduce file system pressure on Windows
    if (dev && !isServer) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: /node_modules/,
      };
    }
    
    // Optimize for Windows file system with absolute path
    config.cache = {
      type: 'filesystem',
      cacheDirectory: path.resolve(process.cwd(), '.next/cache'),
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    };
    
    return config;
  },
  
  // Production optimizations
  poweredByHeader: false,
  compress: true,
  
  // Only ignore errors in development
  eslint: {
    ignoreDuringBuilds: process.env.NODE_ENV !== 'production',
  },
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV !== 'production',
  },
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
  
  // Environment variables validation
  env: {
    BUILDING: process.env.BUILDING,
  },
  
  // Turbopack configuration (moved from experimental.turbo)
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  
  // Experimental features for better performance and Windows compatibility
  experimental: {
    optimizePackageImports: ['react-icons'],
  },
};

export default nextConfig;
