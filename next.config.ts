import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_LOCATION_IMAGE_BASE_URL:
      process.env.NEXT_PUBLIC_LOCATION_IMAGE_BASE_URL ||
      process.env.LOCATION_IMAGE_BASE_URL ||
      '',
  },
  typescript: {
    tsconfigPath: 'tsconfig.build.json',
  },
};

export default nextConfig;
