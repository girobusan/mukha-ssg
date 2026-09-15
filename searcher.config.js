const path = require("path");

module.exports = {
  mode: "production",
  entry: "./src/lib/search/client.lib.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "search_lib.js",
    library: {
      type: "commonjs2",
    },
  },
};
