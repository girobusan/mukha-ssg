import { makeReadSrcListFn } from "../node_fs";
import { createCore } from "../../lib/core";

export function createMemoryRenderer(in_dir, config) {
  console.log(config);
  var inProcess = false;
  var hasToRerun = false;
  var cache = {};

  const core = createCore({
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
        console.log("ready");
        inProcess === false;
        if (hasToRerun) {
          hasToRerun = false;
          core.run();
        }
      }
    },
  });
  console.log("Initial render....");
  core.run();

  return {
    ready: () => !inProcess,
    run: () => {
      inProcess = true;
      core.run();
    },
    get: (p) => cache[p],
  };
}
