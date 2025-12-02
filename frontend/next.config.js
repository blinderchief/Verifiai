/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // output: 'standalone', // Enable standalone output for Docker (requires admin privileges on Windows)
  images: {
    domains: ['images.unsplash.com', 'avatars.githubusercontent.com', 'pbs.twimg.com'],
    unoptimized: process.env.NODE_ENV === 'development',
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `http://localhost:8000/api/v1/:path*`,
      },
    ];
  },
  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
};

module.exports = nextConfig;
