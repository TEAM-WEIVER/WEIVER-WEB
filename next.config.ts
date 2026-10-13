import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/',
          destination: 'https://landing-origin.weiverai.com/',
        },
        {
          source: '/landing-assets/:path*',
          destination: 'https://landing-origin.weiverai.com/landing-assets/:path*',
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
