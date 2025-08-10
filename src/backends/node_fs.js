const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
import { createCore } from "../lib/core";
import { getLogger } from "../lib/logging";
import { execHooks } from "../lib/hooks";
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
  return p.replace(/[\/]/g, path.sep);
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
  let allThere = fs.readdirSync(out_dir, {
    recursive: true,
    withFileTypes: true,
  });
  //const writtenFiles = written;.map((e) => e.path);

  allThere
    .filter((f) => f.isFile())
    .map((f) => path.join(f.parentPath, f.name))
    .forEach((f) => {
      let rezpath = f.substring(out_dir.length).replace(/[\\]/g, "/");
      if (writtenFiles.indexOf(rezpath) == -1) {
        log.debug(" - Removing unknown file:", f);
        try {
          fs.rmSync(f);
        } catch (e) {
          log.warn("Not deleted", f, e);
        }
      }
    });

  allThere
    .filter((e) => e.isDirectory())
    .filter((d) => {
      let dir = path.join(d.parentPath, d.name);
      return (
        fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile())
          .length === 0
      );
    })
    .map((e) => path.join(e.parentPath, e.name))
    .sort((a, b) => b.length - a.length)
    .forEach((p) => {
      log.debug(" - Removing empty dir:", p);
      try {
        fs.rmdirSync(p);
      } catch (e) {
        log.debug("Not deleted:", p, e.code);
      }
    });
  log.info("All clean.");
  // console.log(writtenFiles);
}

function makeMemoGetContent(p) {
  var content;
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

export function backend({ in_dir, out_dir, timed, cleanup }) {
  let Config;
  let written = [];
  try {
    Config = yaml.load(
      fs.readFileSync(path.join(in_dir, "config", "site.yaml"), {
        encoding: "utf8",
      }),
    );
  } catch (e) {
    log.error("Can not load or parse config. Exiting.", e.message);
    process.exit(1);
  }
  if (timed) {
    Config.timed = timed;
  }

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
        execHooks("after", in_dir, "ready");
        log.info("Site ready. Written", written.length, "files total.");
      }
    },
    config: Config,
    env: {
      app: { version: VERSION, build_mode: "MODE", build_date: "BUILDDATE" },
    },
  });
  return { run: core.run };
}
