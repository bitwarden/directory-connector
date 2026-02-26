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
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "build"),
    clean: true,
  },
};

const main = {
  mode: "production",
  target: "electron-main",
  node: {
    __dirname: false,
    __filename: false,
  },
  entry: {
    main: "./src/main.ts",
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
        { from: "./src/images", to: "images" },
        { from: "./src/locales", to: "locales" },
      ],
    }),
  ],
  externals: {
    "electron-reload": "commonjs2 electron-reload",
    keytar: "commonjs2 keytar",
  },
};

export default merge(common, main);
