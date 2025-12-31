// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const reactCompiler = require("eslint-plugin-react-compiler");
const prettier = require("eslint-config-prettier/flat");

module.exports = defineConfig([
  expoConfig,
  prettier,
  reactCompiler.configs.recommended,
  {
    ignores: ["dist/*"],
  },
]);
