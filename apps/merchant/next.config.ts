import type { NextConfig } from 'next';
const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  transpilePackages: ['@eyn/auth', '@eyn/ui', '@eyn/theme', '@eyn/contracts', '@eyn/storefront'],
};
export default config;
