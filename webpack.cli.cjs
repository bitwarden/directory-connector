const path = require("path");

const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");
const webpack = require("webpack");
const nodeExternals = require("webpack-node-externals");

if (process.env.NODE_ENV == null) {
  process.env.NODE_ENV = "development";
}
const ENV = (process.env.ENV = process.env.NODE_ENV);

const moduleRules = [
  {
    test: /\.ts$/,
    use: {
      loader: "ts-loader",
      options: {
        transpileOnly: true,
      },
    },
    exclude: path.resolve(__dirname, "node_modules"),
  },
  {
    test: /\.node$/,
    loader: "node-loader",
  },
];

const plugins = [
  new CleanWebpackPlugin(),
  new CopyWebpackPlugin({
    patterns: [{ from: "./src/locales", to: "locales" }],
  }),
  new webpack.DefinePlugin({
    "process.env.BWCLI_ENV": JSON.stringify(ENV),
  }),
  new webpack.BannerPlugin({
    banner: "#!/usr/bin/env node",
    raw: true,
  }),
  new webpack.IgnorePlugin({
    resourceRegExp: /^encoding$/,
    contextRegExp: /node-fetch/,
  }),
];

const config = {
  mode: ENV,
  target: "node",
  devtool: ENV === "development" ? "eval-source-map" : "source-map",
  node: {
    __dirname: false,
    __filename: false,
  },
  entry: {
    bwdc: "./src/bwdc.ts",
  },
  optimization: {
    minimize: false,
  },
  resolve: {
    extensions: [".ts", ".js", ".json"],
    plugins: [new TsconfigPathsPlugin({ configFile: "./tsconfig.json" })],
    symlinks: false,
    modules: [path.resolve("node_modules")],
  },
  output: {
    filename: "[name].cjs",
    path: path.resolve(__dirname, "build-cli"),
  },
  module: { rules: moduleRules },
  plugins: plugins,
  externals: [nodeExternals()],
};

module.exports = config;
