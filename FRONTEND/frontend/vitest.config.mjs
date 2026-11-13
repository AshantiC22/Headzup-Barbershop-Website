import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  // Components are .js files with JSX in them, the way Next allows.
  esbuild: { include: /\.[jt]sx?$/, exclude: [], loader: "jsx", jsx: "automatic" },
  test: { include: ["test/**/*.test.js"], environment: "node" },
});
