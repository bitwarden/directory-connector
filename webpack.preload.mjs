import path from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

import { merge } from "webpack-merge";
import TsconfigPathsPlugin from "tsconfig-paths-webpack-plugin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const common = {
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: { loader: "ts-loader", options: { configFile: "tsconfig.preload.json" } },
        exclude: /node_modules\/(?!(@bitwarden)\/).*/,
      },
    ],
  },
  plugins: [],
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    plugins: [new TsconfigPathsPlugin({ configFile: "./tsconfig.preload.json" })],
  },
  output: {
    filename: "[name].cjs",
    path: path.resolve(__dirname, "build"),
    pathinfo: false,
    iife: false,
  },
};

const preload = {
  name: "preload",
  mode: "production",
  target: "electron-preload",
  node: {
    __dirname: false,
    __filename: false,
  },
  entry: {
    preload: "src-gui/preload.ts",
  },
  optimization: {
    minimize: false,
  },
};

export default merge(common, preload);
