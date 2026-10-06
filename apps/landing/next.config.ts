import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  transpilePackages: ["@eyn/ui", "@eyn/auth"],
};
export default config;
