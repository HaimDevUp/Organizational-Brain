import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["packages/rbac/**", "packages/shared/**", "apps/web/src/lib/**"],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 65,
      },
    },
  },
});
