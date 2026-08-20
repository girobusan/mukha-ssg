const { parseArgs } = require("node:util");
const path = require("path");
const fs = require("fs");
import { backend as node_backend } from "./backends/node_fs";
import { backend as watch_backend } from "./backends/watch";
import { getLogger, setLevel } from "./lib/logging";
var log = getLogger("main");
import colors from "yoctocolors";
import { execHooks } from "./lib/hooks";
import { makeSiteAt } from "./lib/make_site";
import { checkSafeEditor } from "./lib/util";

const yaml = require("js-yaml");
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
  safe: { type: "boolean", short: "S" }, // TODO:  safe mode = no hooks
  timed: { type: "boolean", short: "t" },
  version: { type: "boolean", short: "v" },
  cleanup: { type: "boolean", short: "c" },
  watch: { type: "boolean", short: "w" },
  port: { type: "string", short: "p" },
  loglevel: { type: "string", short: "l" },
  new: { type: "boolean", short: "n" },
};

const params = parseArgs({ options });
if (params.values.version) {
  console.log(VERSION);
  process.exit(0);
}
if (params.values.new) {
  makeSiteAt();
  process.exit(0);
}

setLevel(params.values.loglevel || "info", true);
const baner = " Mukha SSG v" + VERSION + " ";
const line = Array.from(baner)
  .map(() => "=")
  .join("");

console.log(colors.blue(line));
console.log(colors.blue(baner));
console.log(colors.blue(line));
const input_dir = path.normalize(params.values.input || "./site");
const output_dir = path.normalize(params.values.output || "./static");
// load config HERE!
let Conf;
try {
  Conf = yaml.load(
    fs.readFileSync(path.join(input_dir, "config", "site.yaml"), {
      encoding: "utf8",
    }),
  );
} catch (e) {
  log.error("Can not load or parse config. Exiting.", e.message);
  process.exit(1);
}
//
Conf.safe_mode = params.values.safe;
if (Conf.edit_cmd) {
  let test = checkSafeEditor(Conf.edit_cmd);
  if (!test.good) {
    log.error("Editor disabled.", test.msg || "By reason.");
    Conf.edit_cmd = "";
  } else {
    test.msg && log.info(test.msg);
  }
}
//
if (params.values.timed) {
  Conf.timed = true;
}

// `before`
if (!params.values.safe) execHooks("before", input_dir, "Before hooks");

if (params.values.watch) {
  let port = +params.values.port;
  port = !Number.isNaN(port) && (port > 1024 || port == 0) ? port : 4242;
  let watch_b = watch_backend({
    in_dir: input_dir,
    out_dir: params.values.output ? output_dir : null,
    timed: params.values.timed,
    port: port,
    cleanup: params.values.cleanup,
    config: Conf,
  });
  log.info("Watch mode on.");
  watch_b.run();
} else {
  let node_b = node_backend({
    in_dir: input_dir,
    out_dir: output_dir,
    timed: params.values.timed,
    cleanup: params.values.cleanup,
    config: Conf,
  });
  node_b.run();
}
