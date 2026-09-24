import { isTable, compactTable, writeByString } from "../util/data";
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

// new local data routines
const localPageData = new Map();
//
function addLocalData(pageUrl, ns, dname, dataObj) {
  console.log("ADDING LOCAL DATA", pageUrl);
  if (!localPageData.get(pageUrl)) {
    localPageData.set(pageUrl, { page: {}, components: {} });
  }
  let entry = localPageData.get(pageUrl);
  writeByString(dname, dataObj, ns, entry);
}

function packLocalData(pageUrl) {
  let data = localPageData.get(pageUrl);
  // console.log("packing", localPageData);
  if (!data) {
    return null;
  }
  return `(function(){
window.Mukha._pocb( "${pageUrl}" , ${stringify2JSON(data)})
})()`;
}

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

/*/in tpl: saveData: (name, dt) => saveLocalData4JS(name, dt, page.file.path),
export function _saveLocalData4JS(dname, dset, dpath, ns = "") {
  log.debug("Must save local data: ", dname, dset, dpath);
  if (!dset) {
    log.warn("Attempt to save empty dataset:", dname, dpath);
    return;
  }
  localData.push(prepAnyData(dpath, dname, dset));
}*/

export function saveLocalData2FrontEnd(pageUrl, ns, dname, dataObj) {
  log.info("Must save local data: ", dname, pageUrl);
  addLocalData(pageUrl, ns, dname, dataObj);
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
export function injectPageData(url, html) {
  let e = localPageData.get(url);
  if (!e) {
    // console.log(localPageData);
    return html;
  }
  log.debug("Injecting data to", url);
  const datastr = stringify2JSON(e, true);
  const dataSize = Math.round(new Blob([datastr]).size / 102.4) / 10;
  if (dataSize > 64) {
    log.warn("Big inject:", dataSize, "KiB", "in", url);
  } else {
    log.debug("Inject size is", dataSize, "KiB");
  }

  return html.replace(
    /<\/body>(\s|\n|\r)*<\/html>(\s|\n|\r)*$/i,
    `<script type="application/json" id="mukha_page_data" data-size-kb="${datasize}">${datastr}
</script></body></html>`,
  );
}
export function saveJSAPIfiles(saveFn, copyFn) {
  log.debug("Saving data files...");
  // global datasets
  data.forEach((d) => {
    const dUrl =
      "/_js/data/global/" + d.ns + "/" + d.name.replace(/\./g, "/") + ".js";
    log.debug("Saving global data file", dUrl);
    saveFn(dUrl, packData(dUrl, d.ns, d.name, d.data, d.compacted));
  });
  // local datasets
  localData.forEach((d) => {
    let dUrl = "/_js/data/local" + d.ns + "/" + d.name + ".js"; //?
    log.debug("Saving local data file", dUrl);
    saveFn(dUrl, packData(dUrl, d.ns, d.name, d.data, d.compacted));
  });
  // NEW local datasets
  localPageData.keys().forEach((key) => {
    log.debug("Save local page data for:", key);
    const pack = packLocalData(key);
    // console.log(content);
    saveFn("/_js/data/local" + key + ".js", pack);
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
