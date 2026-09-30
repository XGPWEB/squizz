import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname),
      // "server-only" throws outside the Next.js server build; unit tests run plain Node.
      "server-only": path.resolve(import.meta.dirname, "tests/stubs/empty.ts"),
    },
  },
  test: { include: ["tests/**/*.spec.ts"], environment: "node" },
});
