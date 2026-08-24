import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      // `server-only` throws on import outside a React Server Component. That
      // guard is wanted in the build and unhelpful in a Node test process, so
      // tests swap it for an empty module. See tests/stubs/server-only.ts.
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
