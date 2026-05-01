import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: true,
    include: ["tests/unit/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["./tests/unit/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Stub Next.js's `server-only` guard so unit tests can import server
      // utilities without throwing. The guard's purpose is to fail builds
      // when client code imports server modules — not relevant in vitest.
      "server-only": path.resolve(__dirname, "./tests/unit/server-only-shim.ts"),
    },
  },
});
