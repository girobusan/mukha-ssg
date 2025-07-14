import { isTable, compactTable } from "../util";
import { getLogger } from "../logging";
var log = getLogger("js API");

const clientCode = require("../../../dist/js_api_client.js?raw");

let data = {};

function data2js(nsname, data) {
  const json = JSON.stringify(data.data);
  return `window.Mukha.registerData("${nsname}" , ${json} , ${data.compacted} )`;
}

export function saveData4JS(nsname, dt) {
  let data_out = dt;
  let compacted = false;
  //maybe, compact it?
  if (isTable(dt)) {
    log.debug("Will compact the data:", nsname);
    compacted = true;
    data_out = compactTable(dt);
  } else {
    log.debug("The data is not a table:", nsname);
  }
  data[nsname] = { data: data_out, compacted: compacted };
}

export function saveJSAPIfiles(saveFn) {
  // global datasets
  Object.keys(data).forEach((k) =>
    saveFn(
      "/_js/data/global/" + k.replace(/\./g, "/") + ".js",
      data2js(k, data[k]),
    ),
  );
  // client
  saveFn("/_js/client.js", clientCode);
}
