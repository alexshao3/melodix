function apiInternalUrl() {
  return (
    process.env.API_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:4000'
  ).replace(/\/+$/, '');
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: ['@melodix/ui', '@melodix/shared'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'fastly.picsum.photos' },
      { protocol: 'https', hostname: 'usercontent.jamendo.com' },
      { protocol: 'https', hostname: 'imgjam.com' },
      { protocol: 'https', hostname: 'imgjam2.com' },
      { protocol: 'https', hostname: 'static.jamendo.com' },
      { protocol: 'https', hostname: '*.r2.dev' },
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  // Same-origin proxy for postgres-backend audio so admin previews of
  // freshly-uploaded tracks play. See ADR-0029.
  async rewrites() {
    return [
      {
        source: '/api/storage/:path*',
        destination: `${apiInternalUrl()}/api/storage/:path*`,
      },
    ];
  },
};

export default nextConfig;
