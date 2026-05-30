import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.sopat.tn',
        pathname: '/wp-content/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'sopat.tn',
        pathname: '/wp-content/uploads/**',
      },
    ],
  },
};

export default nextConfig;
