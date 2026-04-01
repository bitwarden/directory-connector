/**
 * Custom webpack additions for @angular-builders/custom-webpack:browser.
 *
 * @angular-builders/custom-webpack:browser already provides:
 *   - AngularWebpackPlugin (.ts compilation via @ngtools/webpack)
 *   - .ts / .js loader rules
 *   - HtmlWebpackPlugin (driven by the `index` option in angular.json)
 *   - SCSS / CSS extraction for styles declared in angular.json `styles` array
 *   - TsconfigPathsPlugin (driven by `tsConfig` in angular.json)
 *
 * This file adds only what the default Angular CLI webpack config does not cover
 * for an electron-renderer target.
 */
const webpack = require("webpack");

module.exports = {
  target: "electron-renderer",

  node: {
    __dirname: false,
  },

  optimization: {
    minimize: false,
    splitChunks: {
      cacheGroups: {
        commons: {
          test: /[\\/]node_modules[\\/]/,
          name: "app/vendor",
          chunks: (chunk) => chunk.name === "app/main",
        },
      },
    },
  },

  module: {
    rules: [
      {
        test: /\.(ttf|otf|eot|svg|woff(2)?)(\?[a-z0-9]+)?$/,
        exclude: /loading\.svg/,
        generator: {
          filename: "fonts/[name][ext]",
        },
        type: "asset/resource",
      },
      // Suppress System.import warnings from older Angular packages.
      // ref: https://github.com/angular/angular/issues/21560
      {
        test: /[/\\]@angular[/\\].+\.js$/,
        parser: { system: true },
      },
    ],
  },

  plugins: [new webpack.DefinePlugin({ "global.GENTLY": false })],
};
