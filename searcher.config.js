const path = require("path");

module.exports = {
  mode: "production",
  entry: "./src/lib/search/client.lib.js",

  output: {
    path: path.resolve(__dirname, "dist"),

    filename: "search-lib.js",
    library: {
      type: "commonjs2",
    },
  },
  externals: {
    preact: "commonjs2 preact",
    "preact/hooks": "commonjs2 preact/hooks",
    "html/preact": "commonjs2 html/preact",
    "mukha-system": "commonjs2 mukha-system",
  },
};
