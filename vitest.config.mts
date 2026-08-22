import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "server-only": path.resolve(import.meta.dirname, "test/mocks/server-only.ts"),
      "@": path.resolve(import.meta.dirname, "."),
    },
  },
});
