const { parseArgs } = require("node:util");
const Papa = require("papaparse");
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
import { createCore } from "./lib/core";
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
};

const params = parseArgs({ options });
if (params.values.version) {
  console.log(VERSION);
  process.exit(0);
}

console.log("\x1b[1mMukha SSG", VERSION, "\x1b[0m");
const inDir = path.normalize(params.values.input || "./site");
const outDir = path.normalize(params.values.output || "./static");
const timed = params.values.timed;

const written = [];

function path2os(p) {
  return p.replace(/[\/]/g, path.sep);
}

function makeMemoGetContent(p) {
  var content;
  return () => {
    if (content === undefined) {
      try {
        content = fs.readFileSync(p, { encoding: "utf8" });
      } catch (e) {
        console.error("Can not read file", p, e.code);
        content = "File was not loaded!";
      }
    }
    return content;
  };
}

function makeReadSrcListFn(inDir) {
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

function makeCopyFn(inDir, outDir) {
  return (source, dest) => {
    // :TEST:
    let from_p = source; //path.join(inDir, path2os(fr));
    let to_p = path.join(outDir, path2os(dest));
    fs.cpSync(from_p, to_p, { recursive: true, force: true });
  };
}

function cleanup() {
  console.log("Cleaning up...");
  let allThere = fs.readdirSync(outDir, {
    recursive: true,
    withFileTypes: true,
  });
  const writtenFiles = written.map((e) => e.path);

  allThere
    .filter((f) => f.isFile())
    .map((f) => path.join(f.parentPath, f.name))
    .forEach((f) => {
      let rezpath = f.substring(outDir.length).replace(/[\\]/g, "/");
      if (writtenFiles.indexOf(rezpath) == -1) {
        console.log(" - Removing unknown file:", f);
        fs.rmSync(f);
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
      console.log(" - Removing empty dir:", p);
      fs.rmdirSync(p);
    });
  console.log("All clean.");
  // console.log(writtenFiles);
}

// load and parse config
// must be done at platform-dependent part
let Config;
try {
  Config = yaml.load(
    fs.readFileSync(path.join(inDir, "config", "site.yaml"), {
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

createCore({
  listSourceFiles: makeReadSrcListFn(inDir),
  writeOutputFile: makeWriteFn(outDir),
  copyFile: makeCopyFn(inDir, outDir),
  callback: (c) => {
    if (c.type === "file" && c.to) {
      written.push({ path: c.to, op: c.stage });
    }
    if (c.type === "status" && c.status === "done") {
      console.log("--------------------");
      console.log("Generation finished.");
      console.log("Written", written.length, "files total.");
      //debug :DELETE:
      fs.writeFileSync("written.csv", Papa.unparse(written));
      if (params.values.cleanup) cleanup();
    }
  },
  config: Config,
  env: {
    app: { version: VERSION, build_mode: "MODE", build_date: "BUILDDATE" },
  },
}).run();
