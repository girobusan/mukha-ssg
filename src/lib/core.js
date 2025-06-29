const posixpath = require("path/posix");
// const yaml = require("js-yaml");
import { preprocessFileList } from "./preprocess";
import { initData } from "./data";

function makeSitePath(sitedir, filename) {
  let p = posixpath.join(sitedir, filename);
  if (!p.startsWith("/")) {
    p = "/" + p;
  }
  return p;
}

function makeCallbacks(callback) {
  if (typeof callback !== "function")
    return { status: () => false, file: () => false };
  const cb = callback;
  return {
    status: (s, v, stage) =>
      cb ? cb({ type: "status", status: s, value: v, stage: stage }) : "",
    file: (op, from, to, stage) =>
      cb
        ? cb({ type: "file", operation: op, from: from, to: to, stage: stage })
        : "",
  };
}

/**
 *
 * @param {Object} Config
 * @property {function} Config.listSourceFiles - functon, takes path rel.
 * to site source dir, return recursive list of all files below it
 * @property {function} Config.writeOutputFile - takes site path and content of the file as args, writes output file
 * @property {functon} Config.copyFile  - takes source path rel to site source dir and site path, copies file
 * @property {function} Config.callback - callback fn
 * @property {object} Config.env - environment data
 */
export function createCore(opts) {
  var options = opts;

  return {
    run: () => runSSG(options),
    changeOption: (n, v) => {
      options[n] = v;
      return createCore(opts);
    },
    changeConfig: (n, v) => {
      options.config[n] = v;
      return createCore(opts);
    },
    changeConfigFile: (c) => {
      options.config = c;
      console.log(options);
      return createCore(opts);
    },
  };
}

const templateRx = /\.(njk|html|htm|nunjucks)$/i;
function runSSG({
  listSourceFiles,
  writeOutputFile,
  copyFile,
  callback,
  config,
  env,
}) {
  //
  //
  //
  const Config = config; //yaml.load(configFile.getContent());
  //
  const Callback = makeCallbacks(callback);
  Callback.status("start", 0);
  const loggedWriteFn = (p, c) => {
    Callback.file("write", null, p, "processing");
    writeOutputFile(p, c);
  };

  //
  //  load templates
  //
  const templateSrcPath = posixpath.join(
    "config/themes",
    Config.theme,
    "templates",
  );
  let templateFiles = listSourceFiles(templateSrcPath);
  if (!templateFiles) {
    throw "No templates files present";
  }
  templateFiles = templateFiles.filter((f) => f.name.match(templateRx));
  if (templateFiles.length === 0) {
    throw "No theme files at " + templateSrcPath;
  }
  const Templates = templateFiles.reduce((a, f) => {
    let tname = posixpath.join(f.parentPath, f.name);
    a[tname.substring(templateSrcPath.length + 1)] = f.getContent();
    return a;
  }, {});

  //
  //  get input files for pages
  //
  const inputFilesSrcPath = "src"; //posixpath.join("src");
  const inputFiles = listSourceFiles(inputFilesSrcPath);
  inputFiles.forEach((f) => {
    let sp = f.parentPath.substring(inputFilesSrcPath.length);
    f.path = makeSitePath(sp, f.name);
  });

  //
  //  load data
  //
  var Data = { _env: env };
  const dataPath = "data";
  const dataFiles = listSourceFiles(dataPath).map((f) => {
    // we need to add separate field for
    // subdirectory, because data module
    // doesn't know from where data files
    // are loaded, but needs to know the subdir
    // structure. Maybe, unify with template routine
    f.dir = f.parentPath.substring(dataPath.length);
    return f;
  });
  Data = initData(dataFiles, Data);
  //
  //  run preprocess
  //
  const filesToCopyFromSrc = preprocessFileList(
    inputFiles,
    // writeOutputFile,
    loggedWriteFn,
    Config,
    Templates,
    Data,
  );
  //
  //  copy files for copy
  //
  filesToCopyFromSrc.forEach((f) => {
    Callback.file("copy", f.src, f.path, "site_static");
    copyFile(f.src, f.path);
  });

  //
  //  copy assets
  //
  const assetsPath = "assets";
  console.log("Copy site assets");
  listSourceFiles(assetsPath).forEach((f) => {
    // console.log("ASSET", f.name);
    let sp = f.parentPath.substring(assetsPath.length);
    f.path = makeSitePath(sp, f.name);
    Callback.file("copy", f.src, f.path, "site_assets");
    copyFile(f.src, f.path);
  });
  // };
  //
  //  copy theme files
  //  config....
  const themeFilesPath = posixpath.join(
    "config",
    "themes",
    Config.theme,
    "assets",
  );
  // const themeFilesOutPath
  const themeAssets = listSourceFiles(themeFilesPath);

  themeAssets.forEach((f) => {
    // console.log("STYLE", f.name);
    const subdir = f.parentPath.substring(themeFilesPath.length + 1);
    // console.log("subdir", subdir);
    // console.log(f);
    let p_to = posixpath.join("/_theme", subdir, f.name);
    Callback.file("copy", f.src, p_to, "theme_assets");
    copyFile(f.src, p_to);
  });
  Callback.status("done");
}
