import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/Calc-",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
