import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'tsdr.uspto.gov' },
      { protocol: 'https', hostname: '**.uspto.gov' },
      { protocol: 'https', hostname: '**.trademarkia.com' },
    ],
  },
};

export default nextConfig;
