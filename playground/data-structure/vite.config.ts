/// <reference types="vitest" />

// Configure Vitest (https://vitest.dev/config/)

import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  test: {
    dir: resolve(__dirname, "test"),
    /* for example, use global to avoid globals imports (describe, test, expect): */
    // globals: true,
  },
});
