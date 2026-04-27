// Resolve the internal API URL when Next reads its config (build + server
// start). Inside Docker, API_INTERNAL_URL=http://api:4000 reaches the API
// container directly. Outside Docker we fall back to NEXT_PUBLIC_API_URL or
// localhost. Defining this in a function lets us re-resolve at server start
// in `output: 'standalone'` mode where rewrites are evaluated then.
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
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  // Proxy `/api/storage/*` to the API container so uploaded audio (Postgres
  // backend) stays same-origin from the browser's POV — no CORS, no need
  // for a separate public API hostname, and HTTP Range headers pass through.
  // See ADR-0029.
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
