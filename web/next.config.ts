import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Removed 'output: export' to support dynamic routes like /dashboard/repos/[id]
  // For static hosting, deploy to Vercel or use Cloudflare Workers with SSR
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://api.recall.team',
  },
};

export default nextConfig;
