import path from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

import CopyWebpackPlugin from "copy-webpack-plugin";
import TsconfigPathsPlugin from "tsconfig-paths-webpack-plugin";
import webpack from "webpack";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (process.env.NODE_ENV == null) {
  process.env.NODE_ENV = "development";
}
const ENV = (process.env.ENV = process.env.NODE_ENV);

const moduleRules = [
  {
    test: /\.ts$/,
    use: "ts-loader",
    exclude: path.resolve(__dirname, "node_modules"),
  },
  {
    test: /\.node$/,
    loader: "node-loader",
  },
];

const plugins = [
  new CopyWebpackPlugin({
    patterns: [{ from: "./src-gui/locales", to: "locales" }],
  }),
  new webpack.DefinePlugin({
    "process.env.BWCLI_ENV": JSON.stringify(ENV),
  }),
  new webpack.BannerPlugin({
    banner: "#!/usr/bin/env node",
    raw: true,
  }),
  new webpack.IgnorePlugin({
    resourceRegExp: /^node-fetch$/,
    contextRegExp: /gaxios/,
  }),
];

const config = {
  mode: ENV,
  target: "node25",
  devtool: ENV === "development" ? "eval-source-map" : "source-map",
  node: {
    __dirname: "eval-only",
    __filename: "eval-only",
  },
  experiments: {
    outputModule: true,
  },
  entry: {
    bwdc: "./src-cli/bwdc.ts",
  },
  optimization: {
    minimize: false,
  },
  resolve: {
    extensions: [".ts", ".js", ".json"],
    plugins: [new TsconfigPathsPlugin({ configFile: "./tsconfig.json" })],
    symlinks: false,
    modules: ["node_modules"],
    alias: {
      // dc-native uses import.meta.url to locate .node binaries, which breaks inside a
      // Node SEA blob. This shim loads the .node file relative to process.execPath instead.
      // pack-sea.mjs copies the .node files alongside the binary at build time.
      "dc-native": path.resolve(__dirname, "scripts/dc-native-sea-shim.mjs"),
    },
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "build-cli"),
    clean: true,
    module: true,
    publicPath: "",
  },
  module: { rules: moduleRules },
  plugins: plugins,
};

export default config;
