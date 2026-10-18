import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  fmt: {
    ignorePatterns: ["dist/**", "src/components/ui/**", "src/vendor/**", "src/hooks/use-mobile.ts"],
  },
  lint: { ignorePatterns: ["dist/**", "src/components/ui/**", "src/vendor/**"] },
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:8080" },
  },
});
