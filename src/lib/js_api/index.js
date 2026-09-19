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

function packData(dataUrl, ns, dname, dataObj, compacted) {
  //
  const json = stringify2JSON(dataObj);
  //
  let thePack = `(function(){
// the pack
   function packed(registerFn){
     registerFn( "${ns}" , "${dname}" , ${json} , ${compacted || false}) 
   }

 window.Mukha._pocb( "${dataUrl}" , packed);

})()`;
  return thePack;
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
  log.debug("Must save local data: ", dname, dset, dpath);
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
  log.debug("Saving data files...");
  // global datasets
  data.forEach((d) => {
    const dUrl =
      "/_js/data/global/" + d.ns + "/" + d.name.replace(/\./g, "/") + ".js";
    log.debug("Saving global data file", dUrl);
    saveFn(
      dUrl,
      // anyData2js(d.ns, d.name, d.data, d.compacted),
      packData(dUrl, d.ns, d.name, d.data, d.compacted),
    );
  });
  // local datasets
  localData.forEach((d) => {
    let dUrl = "/_js/data/local" + d.ns + "/" + d.name + ".js"; //?
    log.debug("Saving local data file", dUrl);
    saveFn(dUrl, packData(dUrl, d.ns, d.name, d.data, d.compacted));
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
