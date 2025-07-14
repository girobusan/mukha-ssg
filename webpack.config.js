const path = require("path");
// const WebpackShellPlugin = require("webpack-shell-plugin-next");
// const HtmlWebpackPlugin = require("html-webpack-plugin");
// const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const LicensePlugin = require("webpack-license-plugin");
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
        test: /\.js$/,
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

module.exports = function(_, argv) {
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
              max_line_len: 120,
              // preamble: "#!/usr/bin/env node",
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
      new LicensePlugin({
        excludedPackageTest: (n, v) => {
          const nms = ["unidecode"];
          return nms.indexOf(n) != -1;
        },
      }),
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
      // new WebpackShellPlugin({
      //   onBuildEnd: ["chmod +x dist/mukha.js", "chmod +x dist/latid2mukha.js"],
      // }),
    ],
  };

  const browserPart = {
    watch: argv.mode != "production",
    optimization: {
      minimize: argv.mode === "production" ? true : false,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            format: {
              comments: false,
              max_line_len: 120,
              // preamble: "#!/usr/bin/env node",
            },
          },
          extractComments: false,
        }),
      ],
    },
    target: "web",

    mode: argv.mode,
    entry: {
      js_api_client: "./src/lib/js_api/client.js",
      search_client: "./src/lib/search/client.js",
    },
    devtool: argv.mode != "production" ? "inline-source-map" : false,

    output: {
      filename: "[name].js",
      path: path.resolve(__dirname, builddir, ""),
    },

    plugins: [
      // new LicensePlugin({
      //   excludedPackageTest: (n, v) => {
      //     const nms = ["unidecode"];
      //     return nms.indexOf(n) != -1;
      //   },
      // }),
      new webpack.DefinePlugin({
        // Definitions...
        VERSION: JSON.stringify(pkg.version),
        BUILDDATE: new Date().toISOString(),
      }),
    ],
  };

  return [
    Object.assign({}, commonSettings, browserPart),
    Object.assign({}, commonSettings, nodePart),
  ];
};
