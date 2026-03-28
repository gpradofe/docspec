import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: "export" is used for production static builds only.
  // In dev mode, it causes generateStaticParams() errors for dynamic routes.
  ...(process.env.NODE_ENV === "production" ? { output: "export" as const } : {}),
  transpilePackages: ["@docspec/core", "@docspec/theme-stripe"],
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
