import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tanstackRouter({ target: "react", autoCodeSplitting: true }), react(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: { environment: "jsdom", setupFiles: ["./src/test-setup.ts"] },
  build: {
    outDir: fileURLToPath(new URL("../server/internal/webui/dist", import.meta.url)),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:8080" },
  },
});
