//CLI generator
const { parseArgs } = require("node:util");
const fs = require("fs");
const path = require("path");
const posixpath = require("path/posix");
const yaml = require("js-yaml");
import { readdirSync } from "node:fs";
import { preprocessFileList } from "./lib/preprocess";
import { initData } from "./lib/data";

const templateRx = /\.(njk|html|htm|nunjucks)$/i;

console.log("Latid2", VERSION);

function fixPath(p) {
  // let r = posixpath.join(path.split(p));
  // if (!r.startsWith("/")) {
  //   r = "/" + r;
  // }
  let r = p.replace(/\\/g, "/");
  if (!r.startsWith("/")) {
    r = "/" + p;
  }
  return r;
}

const options = {
  input: { type: "string", short: "i" },
  output: { type: "string", short: "o" },
  timed: { type: "boolean", short: "t" },
};

const params = parseArgs({ options });
const inputDir = path.normalize(params.input || "./site");
const outputDir = path.normalize(params.output || "./static");
const today = new Date();

// READ CONFIG
const CONFIG = yaml.load(
  fs.readFileSync(path.join(inputDir, "config/site.yaml")),
);

// LIST INPUT FILES
// as fs.Dirent objects
const filesInputDir = path.join(inputDir, "src");
let inputFiles = fs
  .readdirSync(filesInputDir, {
    recursive: true,
    withFileTypes: true,
  })
  .filter((f) => f.isFile())
  .map((f) => {
    return {
      src: path.join(f.parentPath, f.name),
      getContent: () =>
        fs.readFileSync(path.join(f.parentPath, f.name), { encoding: "utf8" }),
      filename: f.name,
      path: fixPath(
        path.join(f.parentPath, f.name).substring(filesInputDir.length),
      ),
    };
  });

// LOAD TEMPLATES
let templatePath;
let allTpls;
if (CONFIG.theme) {
  console.log("Gathering templates for theme", CONFIG.theme);
  templatePath = path.join(
    inputDir,
    "config",
    "themes",
    CONFIG.theme,
    "templates",
  );
  allTpls = fs
    .readdirSync(templatePath, {
      recursive: true,
      withFileTypes: true,
    })
    .filter((f) => f.isFile())
    .reduce((a, ft) => {
      if (!ft.name.match(templateRx)) {
        return a;
      }
      let tpath = path.join(ft.parentPath, ft.name);
      let content = fs.readFileSync(tpath, { encoding: "utf8" });
      a[tpath.substring(templatePath.length + 1).replace(/\\/g, "/")] = content;
      return a;
    }, {});
  // console.log(allTpls);
}
// LOAD DATA
let data = {};
let dataPath = path.join(inputDir, "data");
if (fs.existsSync(dataPath) && fs.lstatSync(dataPath).isDirectory()) {
  let dfiles = readdirSync(dataPath, {
    recursive: true,
    withFileTypes: true,
  })
    .filter((e) => e.isFile())
    .map((f) => {
      return {
        name: f.name,
        dir: f.parentPath.substring(dataPath.length),
        getContent: () =>
          fs.readFileSync(path.join(f.parentPath, f.name), {
            encoding: "utf8",
          }),
      };
    });
  if (dfiles.length > 0) {
    data = initData(dfiles);
  }
}
//
// RUN PREPROCESS ON INPUT FILES
// this returns list of files, which must be just copied
const toCopy = preprocessFileList(
  inputFiles,
  (p, c) => {
    let path2write = path.join(outputDir, p);
    let dir2write = path.dirname(path2write);
    if (!fs.existsSync(dir2write)) {
      fs.mkdirSync(
        dir2write,
        { recursive: true, force: true },
        (e) => e && console.error("Can not create dir", e),
      );
    }
    fs.writeFileSync(path2write, c);
  },
  CONFIG,
  allTpls,
  data,
);
// COPY FILES FROM THE SRC DIR., THAT WHEREN'T PROCESSED
// async
console.info("Copying", toCopy.length, "files...");
toCopy.forEach((f) =>
  fs.cp(
    f.src,
    path.join(outputDir, f.path),
    { recursive: true, force: true },
    (e) => e && console.log(e),
  ),
);
// COPY SITE ASSETS (IF PRESENT)
const assetsPath = path.join(inputDir, "assets");
if (fs.existsSync(assetsPath)) {
  fs.cp(
    assetsPath,
    outputDir,
    { recursive: true, force: true },
    (err) => err && console.error("Can not copy assets", err),
  );
}
// COPY THEME FILES
if (CONFIG.theme) {
  const themeFilesPath = path.join(
    inputDir,
    "config/themes/",
    CONFIG.theme,
    "assets",
  );
  if (fs.existsSync(themeFilesPath)) {
    const themeOuptputPath = path.join(outputDir, "_themes", CONFIG.theme);
    fs.cp(
      themeFilesPath,
      themeOuptputPath,
      { recursive: true, force: true },
      (err) => err && console.error("Can not copy theme files", err),
    );
  } else {
    console.info("Theme does not include assets to copy.");
  }
}
