import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: false,
    // Route handlers touch a single shared database, so keep files sequential.
    fileParallelism: false,
    setupFiles: ["tests/setup.ts"],
    // Generous, because these run against a real database. Against a hosted
    // one such as Neon a test making a dozen round trips is latency bound, not
    // slow. CI uses a local Postgres container and finishes far quicker.
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
