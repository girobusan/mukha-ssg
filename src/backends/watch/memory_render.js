const EventEmitter = require("events");
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
import { makeReadSrcListFn } from "../node_fs";
import { createCore } from "../../lib/core";

const errorDoc = (e, p) => {
  return {
    message: true,
    path: p,
    content: `<!DOCTYPE html><html><body><pre>${e}</pre></body></html>`,
  };
};

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

export function createMemoryRenderer(in_dir, out_dir) {
  const eventBus = new EventEmitter();
  var config = loadConfig(in_dir);
  var inProcess = false;
  var hasToRerun = false;
  var hasError = null;
  var cache = {};
  var options = {
    listSourceFiles: makeReadSrcListFn(in_dir),
    writeOutputFile: (p, c) =>
      (cache[p] = { path: p, type: "written", content: c }),
    copyFile: (src, dest) =>
      (cache[dest] = { path: dest, type: "copy", src: src }),
    config: config,
    env: { app: { version: VERSION, backend: "memory" } }, //make it better
    callback: (obj) => {
      // if (obj.type === "file") {
      //   console.log(obj.operation, obj.to);
      // }
      if (obj.type === "status" && obj.status === "done") {
        eventBus.emit("end", "ready");
        hasError = null;
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
  try {
    core.run();
  } catch (e) {
    hasError = e;
    // console.log("Error", e);
  }

  return {
    on: (evt, fn) => eventBus.on(evt, fn),
    ready: () => !inProcess,
    run: () => {
      (core = core.changeConfigFile(loadConfig(in_dir))), (inProcess = true);
      try {
        core.run();
      } catch (e) {
        eventBus.emit("error", e);
        hasError = e;
      }
    },
    write: () => {
      if (!out_dir) return;
      console.log("Preparing to write...");
      const writeFn = () => {
        for (const pth in cache) {
          let dest = path.join(out_path, pth.replace(/\//g, path.sep));
          if (cache[pth].type === "written") {
            fs.writeFileSync(dest, cache[pth].content, { encoding: "utf8" });
            return;
          }
          if (cache[pth].type === "copy") {
            const where = path.dirname(dest);
            if (!fs.existsSync(where)) {
              fs.mkdirSync(where, { recursive: true });
            }
            fs.copyFileSync(cache[pth].src, dest);
            return;
          }
        }
      }; //end writeFn
      if (!inProcess) {
        writeFn();
      } else {
        eventBus.on("end", writeFn);
      }
    },
    get: (p) => (hasError ? errorDoc(hasError, p) : cache[p]),
  };
}
