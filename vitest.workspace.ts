import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["packages/utils", "apps/api", "apps/web"],
  },
});
