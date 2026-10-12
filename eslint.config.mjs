import css from "@eslint/css";
import { defineConfig } from "eslint/config";
import globals from "globals";
import js from "@eslint/js";
import packageJson from "eslint-plugin-package-json";

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
  },
  {
    // Same package.json rules as the MagicMirror 3rd-party module checker
    files: ["package.json"],
    plugins: { packageJson },
    extends: ["packageJson/recommended"],
    rules: {
      "package-json/require-type": "error",
      "package-json/order-properties": "off",
      "package-json/require-exports": "off",
      "package-json/require-files": "off",
      "package-json/require-sideEffects": "off"
    }
  }
]);
