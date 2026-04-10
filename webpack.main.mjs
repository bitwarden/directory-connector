import path from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

import { merge } from "webpack-merge";
import CopyWebpackPlugin from "copy-webpack-plugin";
import nodeExternals from "webpack-node-externals";
import TsconfigPathsPlugin from "tsconfig-paths-webpack-plugin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const common = {
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules\/(?!(@bitwarden)\/).*/,
      },
    ],
  },
  plugins: [],
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    plugins: [new TsconfigPathsPlugin({ configFile: "./tsconfig.json" })],
  },
  experiments: {
    outputModule: true,
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "build"),
    clean: true,
    library: {
      type: "module",
    },
    chunkFormat: "module",
  },
};

const main = {
  mode: "production",
  target: "electron-main",
  node: {
    __dirname: "node-module",
    __filename: "node-module",
  },
  entry: {
    main: "./src-gui/main.ts",
  },
  optimization: {
    minimize: false,
  },
  module: {
    rules: [
      {
        test: /\.node$/,
        loader: "node-loader",
      },
    ],
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        "./package.json",
        { from: "./src-gui/images", to: "images" },
        { from: "./src-gui/locales", to: "locales" },
      ],
    }),
  ],
  externals: {
    "dc-native": "module dc-native",
  },
};

export default merge(common, main);
