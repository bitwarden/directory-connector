/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("path");

const config = require("./src-gui/bitwarden/components/tailwind.config.base.cjs");

// The base config's content paths point into the clients monorepo; replace them with ours.
config.content = [path.resolve(__dirname, "./src-gui/**/*.{html,ts}")];
config.corePlugins.preflight = true;

module.exports = config;
