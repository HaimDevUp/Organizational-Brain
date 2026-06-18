import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: [
    "@obos/shared",
    "@obos/rbac",
    "@obos/github-git",
    "@obos/ai-providers",
    "@obos/qdrant",
    "@obos/rag",
    "@obos/agents",
    "@obos/graph",
  ],
  serverExternalPackages: [
    "@prisma/client",
    "@obos/database",
    "@qdrant/js-client-rest",
    "undici",
  ],
};

export default nextConfig;
