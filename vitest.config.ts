import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["api/_shared/**/*.test.ts", "apps/**/*.test.ts", "packages/**/*.test.ts"],
    coverage: {
      reporter: ["text", "html"],
    },
  },
});
