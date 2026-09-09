import { isTable, compactTable } from "../util/data";
import { stringify2JSON } from "../util/base";
import { getLogger } from "../logging";
var log = getLogger("js API");
var path = require("path").posix;

const clientCode = require("./prebuild/js_api_client.js?raw");
let logLevel = 4;
export function setJSLogLevel(n) {
  logLevel = n;
}

let data = [];
let localData = [];
let lib = [];
let lib_to_copy = [];
let siteData = { version: VERSION };

function anyData2js(ns, dname, dt, compacted) {
  const json = stringify2JSON(dt);
  return `window.Mukha.registerData( "${ns}" , "${dname}" , ${json} , ${compacted})`;
}

function prepAnyData(ns, dname, dt) {
  let r = testTable(dt, ns + "." + dname);
  r.ns = ns;
  r.name = dname;
  // console.log(r);
  return r;
}

function testTable(d, dataid) {
  let r = { data: d, compacted: false };
  if (isTable(d)) {
    log.debug("Will compact the data:", dataid);
    r.compacted = true;
    r.data = compactTable(d);
  } else {
    log.debug("The data is not a table:", dataid);
  }
  return r;
}

export function saveGlobalData4JS(ns, dname, dset) {
  // console.log("saving", ns + "." + dname);
  if (!dset) {
    log.warn("Attempt to save empty dataset:", ns, dname);
    return;
  }
  data.push(prepAnyData(ns || "datasets", dname, dset));
}

export function saveLocalData4JS(dname, dset, dpath, ns = "") {
  if (!dset) {
    log.warn("Attempt to save empty dataset:", dname, dpath);
    return;
  }
  localData.push(prepAnyData(dpath, dname, dset));
}

export function copyToLib(srcpath, targetpath) {
  let save_path = path.join("/_js/lib/", targetpath);
  lib_to_copy.push([srcpath, save_path]);
  return save_path;
}

export function saveLib(pth, cnt) {
  lib.push({ path: pth, content: cnt });
  return path.join("/_js/lib", pth);
}

export function saveJSAPIfiles(saveFn, copyFn) {
  // global datasets
  data.forEach((d) =>
    saveFn(
      "/_js/data/global/" + d.ns + "/" + d.name.replace(/\./g, "/") + ".js",
      anyData2js(d.ns, d.name, d.data, d.compacted),
    ),
  );
  // local datasets
  localData.forEach((d) => {
    let dp = "/_js/data/local" + d.ns + "/" + d.name + ".js"; //?
    saveFn(dp, anyData2js(d.ns, d.name, d.data, d.compacted));
  });
  //lib
  lib.forEach((l) => {
    let lp = path.join("/_js/lib", l.path);
    saveFn(lp, l.content);
  });

  lib_to_copy.forEach((c) => {
    if (typeof copyFn === "function") {
      // console.log("do copy", c);
      copyFn(c[0], c[1], "js_api");
    }
  });
  // client

  saveFn(
    "/_js/client.js",
    clientCode
      .replace(/"@LOGLEVEL@"/g, logLevel || 4)
      .replace(/("|')@DATA@('|")/, JSON.stringify(siteData)),
  );
}
