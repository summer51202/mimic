import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

export const reviewArchiveTests = [
  "src/shared/brand/ancient-treasure-chest-v04.test.ts",
  "src/shared/brand/ancient-treasure-chest.test.ts",
  "src/shared/brand/home-base-v02.test.ts",
  "src/shared/brand/home-base.test.ts",
  "src/shared/brand/landing-chest-material.test.ts",
  "src/shared/brand/landing-prop-placement-application.test.ts",
  "src/shared/brand/landing-prop-positioning.test.ts",
  "src/shared/brand/landing-title-placement.test.ts",
  "src/shared/brand/pressure-plate-attempt-04-review.test.ts",
  "src/shared/brand/pressure-plate-attempt-05-review.test.ts",
  "src/shared/brand/pressure-plate-attempt-06-review.test.ts",
  "src/shared/brand/pressure-plate-v02.test.ts",
  "src/shared/brand/restored-treasure-chest.test.ts",
  "src/shared/brand/treasure-chest-states.test.ts",
];

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    exclude: [
      ...configDefaults.exclude,
      "e2e/*.spec.ts",
      "e2e/fixtures/**",
      ...reviewArchiveTests,
    ],
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
