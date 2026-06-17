import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: [
    "@obos/database",
    "@obos/shared",
    "@obos/rbac",
    "@obos/github-git",
    "@obos/ai-providers",
    "@obos/qdrant",
    "@obos/rag",
    "@obos/agents",
    "@obos/graph",
  ],
  serverExternalPackages: ["@qdrant/js-client-rest", "undici"],
};

export default nextConfig;
