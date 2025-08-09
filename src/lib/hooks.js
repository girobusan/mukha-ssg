const fs = require("fs");
const path = require("path");
var fork = require("child_process").fork;
import { getLogger } from "../../lib/logging";
var log = getLogger("hooks");
/* hooks */

async function execHook(fname, param) {
  log.info("Running hook:", fname);
  await new Promise(function(res, rej) {
    fork(fname).on("end", res).on("error", rej);
  });
}

// search dir for hooks

export async function execHooks(action, in_dir, param) {
  let dirname = path.join(in_dir, "hooks", action + ".d");
  let frx = new RegExp(action + "\.js", "i");
  // all files in dir
  fs.readdirSync(path.join(in_dir, "hooks"), {
    recursive: true,
    withFileTypes: true,
  })
    .filter((f) => f.isFile())
    .filter((f) => f.name.match(frx))
    .sort((a, b) => {
      const aval = a.name;
      const bval = b.name;
      if (aval > bval) return 1;
      if (aval < bval) return -1;
      return 0;
    })
    .forEach((ft) => { await execHook(path.join(ft.parentPath, ft.name) }, param));

  if (fs.existsSync(dirname)) {
    //all in dir
  }
}
