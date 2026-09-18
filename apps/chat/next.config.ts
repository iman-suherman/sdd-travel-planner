import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "../..");
const agentSrc = path.join(repoRoot, "src");

const nextConfig: NextConfig = {
  // Import agent runtime from repo-root src/
  experimental: {
    externalDir: true,
  },
  outputFileTracingRoot: repoRoot,
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@tripspec": agentSrc,
    };
    return config;
  },
  turbopack: {
    root: repoRoot,
    resolveAlias: {
      "@tripspec": agentSrc,
    },
  },
};

export default nextConfig;
