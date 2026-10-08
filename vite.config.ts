import { defineConfig } from "vite";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

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
            input: {
                index: resolve(projectRoot, "index.html"),
                docs: resolve(projectRoot, "docs.html")
            },
            output: {
                manualChunks(id) {
                    if (id.includes("node_modules")) {
                        return "vendor";
                    }
                    return undefined;
                }
            }
        }
    },
    server: {
        allowedHosts: ["buildzen-studio.loca.lt"]
    }
});
