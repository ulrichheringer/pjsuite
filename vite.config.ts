import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    ignorePatterns: [
      "**/dist/**",
      "web/src/components/ui/**",
      "web/src/vendor/**",
      "web/src/hooks/use-mobile.ts",
      "web/src/routeTree.gen.ts",
      "design/**",
    ],
  },
  lint: {
    ignorePatterns: [
      "**/dist/**",
      "web/src/components/ui/**",
      "web/src/vendor/**",
      "web/src/routeTree.gen.ts",
      "design/**",
    ],
  },
});
