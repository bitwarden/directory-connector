import path from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import webpack from "webpack";
import { merge } from "webpack-merge";
import HtmlWebpackPlugin from "html-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import { AngularWebpackPlugin } from "@ngtools/webpack";
import TsconfigPathsPlugin from "tsconfig-paths-webpack-plugin";
import sass from "sass";

// ESM __dirname polyfill for Node 20
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const common = {
  module: {
    rules: [
      {
        test: /\.[cm]?js$/,
        use: [
          {
            loader: "babel-loader",
            options: {
              configFile: false,
              plugins: ["@angular/compiler-cli/linker/babel"],
            },
          },
        ],
      },
      {
        test: /\.[jt]sx?$/,
        loader: "@ngtools/webpack",
      },
      {
        test: /\.(jpe?g|png|gif|svg)$/i,
        exclude: /.*(bwi-font)\.svg/,
        generator: {
          filename: "images/[name][ext]",
        },
        type: "asset/resource",
      },
    ],
  },
  plugins: [],
  resolve: {
    extensions: [".tsx", ".ts", ".js", ".json"],
    plugins: [new TsconfigPathsPlugin({ configFile: "./tsconfig.json" })],
    symlinks: false,
    modules: [path.resolve("node_modules")],
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "build"),
  },
};

const renderer = {
  mode: "production",
  devtool: false,
  target: "electron-renderer",
  node: {
    __dirname: false,
  },
  entry: {
    "app/main": "./src/app/main.ts",
  },
  optimization: {
    minimize: false,
    splitChunks: {
      cacheGroups: {
        commons: {
          test: /[\\/]node_modules[\\/]/,
          name: "app/vendor",
          chunks: (chunk) => {
            return chunk.name === "app/main";
          },
        },
      },
    },
  },
  module: {
    rules: [
      {
        test: /\.(html)$/,
        loader: "html-loader",
      },
      {
        test: /.(ttf|otf|eot|svg|woff(2)?)(\?[a-z0-9]+)?$/,
        exclude: /loading.svg/,
        generator: {
          filename: "fonts/[name][ext]",
        },
        type: "asset/resource",
      },
      {
        test: /\.scss$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              publicPath: "../",
            },
          },
          "css-loader",
          {
            loader: "sass-loader",
            options: {
              implementation: sass,
            },
          },
        ],
      },
      // Hide System.import warnings. ref: https://github.com/angular/angular/issues/21560
      {
        test: /[\/\\]@angular[\/\\].+\.js$/,
        parser: { system: true },
      },
    ],
  },
  plugins: [
    new AngularWebpackPlugin({
      tsConfigPath: "tsconfig.json",
      entryModule: "src/app/app.module#AppModule",
      sourceMap: true,
    }),
    // ref: https://github.com/angular/angular/issues/20357
    new webpack.ContextReplacementPlugin(
      /\@angular(\\|\/)core(\\|\/)fesm5/,
      path.resolve(__dirname, "./src"),
    ),
    new HtmlWebpackPlugin({
      template: "./src/index.html",
      filename: "index.html",
      chunks: ["app/vendor", "app/main"],
    }),
    new webpack.SourceMapDevToolPlugin({
      include: ["app/main.js"],
    }),
    new webpack.DefinePlugin({ "global.GENTLY": false }),
    new MiniCssExtractPlugin({
      filename: "[name].[contenthash].css",
      chunkFilename: "[id].[contenthash].css",
    }),
  ],
};

export default merge(common, renderer);
