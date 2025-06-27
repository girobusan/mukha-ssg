const { parseArgs } = require("node:util");
const path = require("path");
import { backend as node_backend } from "./backends/node_fs";
import { backend as watch_backend } from "./backends/watch";

//
process.on("uncaughtException", (error) => {
  console.error(error.message, error.code); // Message and code
  process.exit(1); //
});
//
// parse input params

const options = {
  input: { type: "string", short: "i" },
  output: { type: "string", short: "o" },
  timed: { type: "boolean", short: "t" },
  version: { type: "boolean", short: "v" },
  cleanup: { type: "boolean", short: "c" },
  watch: { type: "boolean", short: "w" },
};
// w watch

const params = parseArgs({ options });
if (params.values.version) {
  console.log(VERSION);
  process.exit(0);
}

console.log("\x1b[1mMukha SSG", VERSION, "\x1b[0m");
const input_dir = path.normalize(params.values.input || "./site");
const output_dir = path.normalize(params.values.output || "./static");

let node_b = node_backend({
  in_dir: input_dir,
  out_dir: output_dir,
  timed: params.values.timed,
  cleanup: params.values.cleanup,
});

let watch_b = watch_backend({});

if (params.values.watch) {
  watch_b.run({
    in_dir: input_dir,
    out_dir: options.values.output ? output_dir : null,
  });
} else {
  node_b.run();
}
