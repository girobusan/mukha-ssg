const fs = require("fs");
const path = require("path");
import { createCore } from "../lib/core";
import { getLogger } from "../lib/logging";
import { execHooks } from "../lib/hooks";
import { absPath } from "../lib/util";
var log = getLogger("node-fs");

// backend takes its args
// takes core (?)
// runs core, works with results
// may have backend-specific functions?
//
// non-specific:
// add configuration
// run generation — ?

function path2os(p) {
  return p.replace(/[\\\/]/g, path.sep);
}

export function makeReadSrcListFn(inDir) {
  return (pth) => {
    pth = pth.replace(/[\/]/g, path.sep);
    const srcInputDir = path.join(inDir, pth);
    if (!fs.existsSync(srcInputDir)) {
      return [];
    }
    const lst = fs
      .readdirSync(srcInputDir, {
        recursive: true,
        withFileTypes: true,
      })
      // .forEach((e) => console.log(e.name, e.isFile()))
      .filter((f) => f.isFile())
      .map((f) => {
        // this path required if file
        //  later copied
        const fullSrcPath = path.join(f.parentPath, f.name);
        // cut parentPath to minic reading a pth dir , not inDir+pth
        f.parentPath = f.parentPath.substring(inDir.length + 1);
        f.src = fullSrcPath; //full path to file from site folder
        f.getContent = makeMemoGetContent(fullSrcPath);
        return f;
      });
    return lst;
  };
}

function makeWriteFn(outDir) {
  return (p, c) => {
    let normp = p.replace(/[\/]/g, path.sep);
    normp = path.join(outDir, normp);
    const pdir = path.dirname(normp);
    if (!fs.existsSync(pdir)) {
      fs.mkdirSync(pdir, { recursive: true, force: true });
    }
    fs.writeFileSync(normp, c, { encoding: "utf8" });
  };
}

function makeCopyFn(_, outDir) {
  return (source, dest) => {
    // :TEST:
    let from_p = source; //path.join(inDir, path2os(fr));
    let to_p = path.join(outDir, path2os(dest));
    fs.cpSync(from_p, to_p, { recursive: true, force: true });
  };
}
export function cleanupAfter(writtenFiles, out_dir) {
  log.info("Cleaning up...");

  // Set for speed
  const writtenSet = new Set(writtenFiles);

  const allEntries = fs.readdirSync(out_dir, {
    recursive: true,
    withFileTypes: true,
  });

  const files = [];
  const dirs = [];

  for (const entry of allEntries) {
    const fullPath = path.join(entry.parentPath, entry.name);
    if (entry.isFile()) {
      files.push(fullPath);
    } else if (entry.isDirectory()) {
      dirs.push(fullPath);
    }
  }

  // remove unwritten files
  let deletedFilesCount = 0;
  let deletedDirsCount = 0;
  for (const filePath of files) {
    const rezpath = filePath.substring(out_dir.length).replace(/[\\]/g, "/");
    if (!writtenSet.has(rezpath)) {
      log.debug(" - Removing unknown file:", filePath);
      try {
        fs.rmSync(filePath);
        deletedFilesCount++;
      } catch (e) {
        log.warn("Not deleted", filePath, e);
      }
    }
  }

  // remove empty dirs
  const sortedDirs = dirs.sort((a, b) => b.length - a.length);

  for (const dirPath of sortedDirs) {
    // if exists and empty
    try {
      const contents = fs.readdirSync(dirPath);
      if (contents.length === 0) {
        log.debug(" - Removing empty dir:", dirPath);
        fs.rmdirSync(dirPath);
        deletedDirsCount++;
      }
    } catch (e) {
      if (e.code !== "ENOENT") {
        log.warn("Not deleted:", dirPath, e.code);
      }
    }
  }
  let logMsg;
  if (deletedFilesCount | (deletedDirsCount !== 0)) {
    logMsg = `Deleted: files — ${deletedFilesCount}, directories — ${deletedDirsCount}.`;
  } else {
    logMsg = "No extraneous files were found.";
  }
  log.info(logMsg);
}

function makeMemoGetContent(p) {
  let content;
  return () => {
    if (content === undefined) {
      try {
        content = fs.readFileSync(p, { encoding: "utf8" });
      } catch (e) {
        log.error("Can not read file", p, e.code);
        content = "File was not loaded!";
      }
    }
    return content;
  };
}

export function backend({ in_dir, out_dir, cleanup, config }) {
  let written = [];

  const core = createCore({
    listSourceFiles: makeReadSrcListFn(in_dir),
    writeOutputFile: makeWriteFn(out_dir),
    copyFile: makeCopyFn(in_dir, out_dir),
    callback: (c) => {
      if (c.type === "file" && c.to) {
        written.push({ path: c.to, op: c.stage });
      }
      if (c.type === "status" && c.status === "done") {
        //debug :DELETE:
        // fs.writeFileSync("written.csv", Papa.unparse(written));
        if (cleanup) {
          cleanupAfter(
            written.map((e) => e.path),
            out_dir,
          );
        }
        if (!config.safe_mode) execHooks("after", in_dir, absPath(out_dir));
        //
        log.info("Site ready. Written", written.length, "files total.");
      }
    },
    config: config,
    env: {
      app: { version: VERSION, build_mode: "MODE", build_date: "BUILDDATE" },
    },
  });
  return { run: core.run };
}
