const path = require("path");
const WebpackShellPlugin = require("webpack-shell-plugin-next");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const webpack = require("webpack");
const pkg = require("./package.json");
const TerserPlugin = require("terser-webpack-plugin");

const commonSettings = {
  module: {
    rules: [
      {
        test: /\.svg$/,
        resourceQuery: /raw/,
        type: "asset/source",
      },

      {
        test: /\.svg$/,
        resourceQuery: { not: [/raw/] },
        type: "asset/inline",
      },
      {
        test: /\.htm$/,
        resourceQuery: /raw/,
        type: "asset/source",
      },

      {
        test: /\.(less|css|scss)$/,
        use: ["style-loader", "css-loader", "sass-loader"],
      },
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: "babel-loader",
        },
      },
      {
        test: /\.(woff|ttf)$/,
        use: [
          {
            loader: "file-loader",
            options: {
              name: "fonts/[name].[ext]",
            },
          },
        ],
      },
    ],
  },
};

module.exports = function (_, argv) {
  let builddir = argv.mode == "production" ? "dist" : "test";

  const nodePart = {
    watch: argv.mode != "production",
    optimization: {
      minimize: argv.mode === "production" ? true : false,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            format: {
              comments: false,
            },
          },
          extractComments: false,
        }),
      ],
    },
    target: "node",

    mode: argv.mode,
    entry: {
      latid2mukha: "./src/latid2mukha.js",
      mukha: "./src/cli.js",
    },
    devtool: argv.mode != "production" ? "inline-source-map" : false,

    output: {
      //   filename: '[name].js',
      path: path.resolve(__dirname, builddir, ""),
    },

    plugins: [
      new webpack.DefinePlugin({
        // Definitions...
        VERSION: JSON.stringify(pkg.version),
        MODE: argv.mode,
        BUILDDATE: new Date().toISOString(),
      }),
      new webpack.BannerPlugin({
        entryOnly: true,
        banner: "#!/usr/bin/env node",
        raw: true,
      }),
      new WebpackShellPlugin({
        onBuildEnd: ["chmod +x dist/mukha.js", "chmod +x dist/latid2mukha.js"],
      }),
    ],
  };

  return [Object.assign(commonSettings, nodePart)];
};
