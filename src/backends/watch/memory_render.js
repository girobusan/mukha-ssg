const EventEmitter = require("events");
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
import { makeReadSrcListFn } from "../node_fs";
import { createCore } from "../../lib/core";
import { cleanupAfter } from "../node_fs";
import { getLogger } from "../../lib/logging";
import { execHooks } from "../../lib/hooks";
import { absPath } from "../../lib/util";
var log = getLogger("memrender");

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
    log.error("Can not load or parse config.", e.message);
    process.exit(1);
  }
  if (timed) {
    Config.timed = timed;
  }
  return Config;
}

export function createMemoryRenderer(in_dir, out_dir, cleanup) {
  const eventBus = new EventEmitter();
  var config = loadConfig(in_dir);
  var inProcess = false;
  var currentError = null;
  var cache = {};
  var options = {
    listSourceFiles: makeReadSrcListFn(in_dir),
    writeOutputFile: (p, c, pinfo) =>
      (cache[p] = { path: p, type: "written", content: c, page: pinfo }),
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
        currentError = null;
        inProcess === false;
      }
    },
  };

  var core = createCore(options);
  log.info("Initial render....");
  try {
    core.run();
  } catch (e) {
    currentError = e;
    // console.log("Error", e);
  }

  return {
    clear: (p) => delete cache[p],
    on: (evt, fn) => eventBus.on(evt, fn),
    ready: () => !inProcess,
    run: () => {
      (core = core.changeConfigFile(loadConfig(in_dir))), (inProcess = true);
      try {
        core.run();
      } catch (e) {
        eventBus.emit("error", e);
        currentError = e;
      }
    },
    write: () => {
      if (!out_dir) {
        log.info("Nothing is written to output.");
        return;
      }
      log.info("Writting", Object.keys(cache).length, "objects to", out_dir);

      const writeCached = () => {
        for (let pth in cache) {
          log.debug("Writting:", pth);
          let dest = path.join(out_dir, pth.replace(/\//g, path.sep));
          const where = path.dirname(dest);
          if (!fs.existsSync(where)) {
            fs.mkdirSync(where, { recursive: true });
          }
          if (cache[pth].type === "written") {
            fs.writeFileSync(dest, cache[pth].content, { encoding: "utf8" });
          }
          if (cache[pth].type === "copy") {
            fs.copyFileSync(cache[pth].src, dest);
          }
        }
        if (cleanup) {
          cleanupAfter(Object.keys(cache), out_dir);
        }
      }; //end writeFn
      if (!inProcess) {
        //:TODO: redo
        writeCached();
        execHooks("after", in_dir, absPath(out_dir));
      } else {
        eventBus.on("end", () => {
          writeCached();
          execHooks("after", in_dir, absPath(out_dir));
        });
      }
    },
    get: (p) => (currentError ? errorDoc(currentError, p) : cache[p]),
  };
}
