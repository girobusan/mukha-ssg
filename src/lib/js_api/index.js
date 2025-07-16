import { isTable, compactTable } from "../util";
import { getLogger } from "../logging";
var log = getLogger("js API");

const clientCode = require("../../../dist/js_api_client.js?raw");

let data = [];
let localData = [];

function data2js(dataObj) {
  const json = JSON.stringify(dataObj.data);
  return `window.Mukha.registerData("${dataObj.nsname}" , ${json} , ${dataObj.compacted} )`;
}

function localData2js(dataObj) {
  const json = JSON.stringify(data.data);
  return `window.Mukha.registerLocalData ("${dataObj.path}" , ${dataObj.name} ,
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
  let r = testTable(dset, dpath + "/" + name);
  r.path = dpath;
  r.name = name;
  localData.push(r);
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
    let dp = "/_js/data/local/" + d.path + "/" + (d.name || "data") + ".js"; //?
    saveFn(dp, localData2js(d));
  });
  // client
  saveFn("/_js/client.js", clientCode);
}
