import { isTable, compactTable, stringify2JSON } from "../util";
import { getLogger } from "../logging";
var log = getLogger("js API");
var path = require("path").posix;

const clientCode = require("../../../dist/js_api_client.js?raw");

let data = [];
let localData = [];
let lib = [];

// function data2js(dataObj) {
//   const json = stringify2JSON(dataObj.data);
//   return `window.Mukha.registerData("${dataObj.nsname}" , ${json} , ${dataObj.compacted} )`;
// }
//
// function localData2js(dataObj) {
//   const json = stringify2JSON(dataObj.data);
//   return `window.Mukha.registerLocalData ("${dataObj.path}" , "${dataObj.name}" ,
// ${json} , ${dataObj.compacted} )`;
// }

function anyData2js(ns, dname, dt, compacted) {
  const json = stringify2JSON(dt);
  return `window.Mukha.registerData( "${ns}" , "${dname}" , ${json} , ${compacted})`;
}

function prepAnyData(ns, dname, dt) {
  let r = testTable(dt, ns);
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

export function saveData4JS(ns_and_name, dt) {
  let parts = ns_and_name.split(".");
  let ns, dname;
  ns = parts.length === 1 ? "datasets" : parts[0];
  dname = parts.length === 1 ? parts[0] : parts.slice(1).join(".");
  data.push(prepAnyData(ns, dname, dt));
}

export function saveLocalData4JS(dname, dset, dpath) {
  if (!dset) {
    log.warn("Attempt to save empty dataset:", dname, dpath);
    return;
  }
  localData.push(prepAnyData(dpath, dname, dset));
}

export function saveLib(pth, cnt) {
  lib.push({ path: pth, content: cnt });
}

export function saveJSAPIfiles(saveFn) {
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
  // client
  saveFn("/_js/client.js", clientCode);
}
