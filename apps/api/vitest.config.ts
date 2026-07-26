import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: false,
    // Route handlers touch a single shared database, so keep files sequential.
    fileParallelism: false,
    setupFiles: ["tests/setup.ts"],
    testTimeout: 20_000,
  },
});
