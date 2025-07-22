import { isTable, compactTable, stringify2JSON } from "../util";
import { getLogger } from "../logging";
var log = getLogger("js API");
var path = require("path").posix;

const clientCode = require("../../../dist/js_api_client.js?raw");

let data = [];
let localData = [];
let lib = [];

function data2js(dataObj) {
  const json = stringify2JSON(dataObj.data);
  return `window.Mukha.registerData("${dataObj.nsname}" , ${json} , ${dataObj.compacted} )`;
}

function localData2js(dataObj) {
  const json = stringify2JSON(dataObj.data);
  return `window.Mukha.registerLocalData ("${dataObj.path}" , "${dataObj.name}" ,
${json} , ${dataObj.compacted} )`;
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

export function saveData4JS(nsname, dt) {
  let r = testTable(dt, nsname);
  r.nsname = nsname;
  data.push(r);
}

export function saveLocalData4JS(name, dset, dpath) {
  if (!dset) {
    log.warn("Attempt to save empty dataset:", name, dpath);
    return;
  }
  let r = testTable(dset, dpath + "/" + name);
  r.path = dpath;
  r.name = name;
  localData.push(r);
}

export function saveLib(pth, cnt) {
  lib.push({ path: pth, content: cnt });
}

export function saveJSAPIfiles(saveFn) {
  // global datasets
  data.forEach((d) =>
    saveFn(
      "/_js/data/global/" + d.nsname.replace(/\./g, "/") + ".js",
      data2js(d),
    ),
  );
  // local datasets
  localData.forEach((d) => {
    let dp = "/_js/data/local" + d.path + "/" + d.name + ".js"; //?
    saveFn(dp, localData2js(d));
  });
  //lib
  lib.forEach((l) => {
    let lp = path.join("/_js/lib", l.path);
    saveFn(lp, l.content);
  });
  // client
  saveFn("/_js/client.js", clientCode);
}
