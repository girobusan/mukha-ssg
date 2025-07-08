const { parseArgs } = require("node:util");
const path = require("path");
import { backend as node_backend } from "./backends/node_fs";
import { backend as watch_backend } from "./backends/watch";
import { getLogger, setLevel } from "./lib/logging";
var log = getLogger("cli");
import colors from "yoctocolors";
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
  port: { type: "string", short: "p" },
  loglevel: { type: "string", short: "l" },
};
// cow pi tv

const params = parseArgs({ options });
if (params.values.version) {
  console.log(VERSION);
  process.exit(0);
}
setLevel(params.values.loglevel || "info", true);

console.log(colors.cyanBright("\x1b[1mMukha SSG " + VERSION + " \x1b[0m"));
const input_dir = path.normalize(params.values.input || "./site");
const output_dir = path.normalize(params.values.output || "./static");

if (params.values.watch) {
  let port = +params.values.port;
  port = !Number.isNaN(port) && port > 1024 ? port : 4242;
  let watch_b = watch_backend({
    in_dir: input_dir,
    out_dir: output_dir,
    timed: params.values.timed,
    port: port,
  });
  log.info("Watch mode on.");
  watch_b.run();
} else {
  let node_b = node_backend({
    in_dir: input_dir,
    out_dir: output_dir,
    timed: params.values.timed,
    cleanup: params.values.cleanup,
  });
  node_b.run();
}
