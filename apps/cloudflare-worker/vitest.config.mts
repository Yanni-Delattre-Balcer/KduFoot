import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  resolve: {
    // Allow vitest to resolve workspace-hoisted packages (uuid, jose, etc.)
    // from the monorepo root node_modules when not found locally.
    modules: [
      path.resolve(__dirname, "node_modules"),
      path.resolve(__dirname, "../../node_modules"),
    ],
  },
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json"],
      thresholds: {
        lines: 50,
        functions: 50
      }
    }
  }
})
