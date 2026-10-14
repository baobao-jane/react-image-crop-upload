import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  // Hooks and refs require a client boundary in React Server Components apps.
  banner: { js: '"use client";' },
});
