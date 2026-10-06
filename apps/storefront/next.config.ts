import type { NextConfig } from 'next';
const config: NextConfig = {
  env: { NEXT_PUBLIC_MERCHANT_URL: process.env.NEXT_PUBLIC_MERCHANT_URL || "http://localhost:3000" },
  poweredByHeader: false,
  devIndicators: false,
  transpilePackages: ['@eyn/ui', '@eyn/theme', '@eyn/contracts', '@eyn/storefront'],
};
export default config;
