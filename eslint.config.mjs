import css from "@eslint/css";
import { defineConfig } from "eslint/config";
import globals from "globals";
import js from "@eslint/js";

export default defineConfig([
  {
    files: ["**/*.css"],
    plugins: { css },
    language: "css/css",
    extends: ["css/recommended"],
    rules: {
      // MagicMirror runs in Electron (Chromium), so cross-browser baseline doesn't apply
      "css/use-baseline": "off"
    }
  },
  {
    files: ["MMM-OverlayEffects.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        ...globals.browser,
        Log: "readonly",
        Module: "readonly"
      }
    },
    plugins: { js },
    extends: ["js/recommended"]
  },
  {
    files: ["test/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: globals.node
    },
    plugins: { js },
    extends: ["js/recommended"]
  },
  {
    files: ["**/*.mjs"],
    languageOptions: { ecmaVersion: "latest", sourceType: "module" },
    plugins: { js },
    extends: ["js/recommended"]
  }
]);
