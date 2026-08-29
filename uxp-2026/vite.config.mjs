import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  publicDir: "public",
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    minify: false,
    sourcemap: true,
    target: "esnext",
    rollupOptions: {
      input: resolve(root, "index.ts"),
      external: ["premierepro", "uxp"],
      output: {
        format: "cjs",
        entryFileNames: "index.js"
      }
    }
  }
});
