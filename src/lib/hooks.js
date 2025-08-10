const fs = require("fs");
const path = require("path");
var execSync = require("child_process").execSync;
import { getLogger } from "./logging";
var log = getLogger("hooks");
/* hooks */
const jsrx = /.*\.js$/i;

function execHookList(lst, in_dir, param) {
  lst.forEach((hft) => {
    let logname = hft.name;
    let command = logname.match(jsrx) ? "node " : "";
    let output = "";
    try {
      output = execSync(command + path.join(hft.parentPath, hft.name), {
        input: param,
      });
    } catch (e) {
      log.error("Can not exec", logname, e.message);
    }
    output
      .toString()
      .trim()
      .split("\n")
      .forEach((d) => log.info(logname + ":", d.toString().trim()));
  });
}

function hookSorter(a, b) {
  const aval = a.name;
  const bval = b.name;
  if (aval > bval) return 1;
  if (aval < bval) return -1;
  return 0;
}

// search dir for hooks

export function execHooks(action, in_dir, param) {
  const frx = new RegExp(action + "\.?\w*", "i");
  let dirname = path.join(in_dir, "hooks", action + ".d");
  let hooksDir = [];
  let hooksFiles = [];
  // all files in dir
  if (fs.existsSync(path.join(in_dir, "hooks"))) {
    hooksFiles = fs
      .readdirSync(path.join(in_dir, "hooks"), {
        recursive: false,
        withFileTypes: true,
      })
      .filter((f) => f.isFile())
      .filter((f) => f.name.match(frx))
      .sort(hookSorter);
  }

  log.debug("Hooks in files:", hooksFiles.length);

  if (fs.existsSync(dirname)) {
    //all in dir
    hooksDir = fs
      .readdirSync(dirname, { recursive: false, withFileTypes: true })
      .filter((f) => f.isFile())
      // .filter((f) => f.name.match(jsrx))
      .sort(hookSorter);
  }

  log.debug("Hooks in " + action + ".d" + " directory:", hooksDir.length);

  execHookList(hooksFiles.concat(hooksDir), in_dir, param);
}
