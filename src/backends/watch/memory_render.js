const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
import { makeReadSrcListFn } from "../node_fs";
import { createCore } from "../../lib/core";

function loadConfig(in_dir, timed) {
  let Config;
  try {
    Config = yaml.load(
      fs.readFileSync(path.join(in_dir, "config", "site.yaml"), {
        encoding: "utf8",
      }),
    );
  } catch (e) {
    console.log("Can not load or parse config.", e.message);
    process.exit(1);
  }
  if (timed) {
    Config.timed = timed;
  }
  return Config;
}

export function createMemoryRenderer(in_dir, _) {
  var config = loadConfig(in_dir);
  var inProcess = false;
  var hasToRerun = false;
  var cache = {};
  var onEndFn = () => console.log("ready");
  var options = {
    listSourceFiles: makeReadSrcListFn(in_dir),
    writeOutputFile: (p, c) =>
      (cache[p] = { path: p, type: "written", content: c }),
    copyFile: (src, dest) =>
      (cache[dest] = { path: dest, type: "copy", src: src }),
    config: config,
    env: { buildtype: "memory" }, //make it better
    callback: (obj) => {
      // if (obj.type === "file") {
      //   console.log(obj.operation, obj.to);
      // }
      if (obj.type === "status" && obj.status === "done") {
        onEndFn();
        console.log("ready");
        inProcess === false;
        if (hasToRerun) {
          hasToRerun = false;
          core.run();
        }
      }
    },
  };

  var core = createCore(options);
  console.log("Initial render....");
  core.run();

  return {
    onEnd: (fn) => (onEndFn = fn),
    ready: () => !inProcess,
    run: () => {
      (core = core.changeConfigFile(loadConfig(in_dir))), (inProcess = true);
      core.run();
    },
    get: (p) => cache[p],
  };
}
