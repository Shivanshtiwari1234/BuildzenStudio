import { defineConfig } from "vite";

export default defineConfig({
  preview: {
    host: "0.0.0.0",
    port: 4173
  },
  build: {
    target: "es2020",
    sourcemap: false,
    minify: "esbuild",
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            return "vendor";
          }
          return undefined;
        }
      }
    }
  }
});
