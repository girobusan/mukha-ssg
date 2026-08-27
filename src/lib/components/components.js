import { saveGlobalData4JS, saveLib } from "../js_api";
import { wrapForWeb } from "./web_template.js";
import { stringify2JSON } from "../util";
//
const preact = require("preact");
const hooks = require("preact/hooks");
const htm = require("htm/preact");
const compat = require("preact/compat");
import { renderToString } from "preact-render-to-string";

import { getLogger } from "../logging";
var log = getLogger("comps");
import { findRequires, normalizeName } from "./comp_util";
//
// dicts
const internal = new Map([
  ["preact", { exports: preact }], //module!!
  ["preact/hooks", { exports: hooks }],
  ["preact/compat", { exports: compat }],
  ["htm/preact", { exports: htm }],
]);
const loaded = new Map();
const lookup = {};
const assets = {};
//

function myRequire(n) {
  let name = normalizeName(n);
  let M = internal.get(name) || loaded.get(name);
  if (!M) {
    log.error("Can not require", n);
    return;
  }
  return M.exports;
}
//
export function findFunction(fn_name) {
  // find component...
  let module_name = lookup[fn_name]; // name of the module
  if (!module_name) {
    console.error("Can not find any module with exported", fn_name);
    return null;
  }
  let M = loaded.get(module_name);
  if (!M) {
    console.error("Can not find module", module_name, "with exported", fn_name);
    return null;
  }
  return M.exports[fn_name];
}
//
export function createElement(fn_name, props) {
  const MUKHA_STRING_RENDER = true;
  let fn = findFunction(fn_name); // returns content of module.exports[fn_name]
  return preact.h(fn, props);
}

export function renderComponentToString(fn_name, props) {
  return renderToString(createElement(fn_name, props));
}
//
export function initComponents(flist) {
  log.info("Init components...");
  if (!flist || flist.length == 0) {
    log.info("Components wasnt used.");
    return;
  }
  //test
  let modulesTable = [];
  let sortTable = [];
  //
  flist.forEach((f) => {
    let mSrc = f.getContent();
    log.info("Module", f.name);
    let mReq = findRequires(mSrc).map((e) => normalizeName(e));
    if (mReq) log.info("requires:", mReq);
    modulesTable.push({ name: f.name, requires: mReq, src: mSrc });
    sortTable.push({ name: f.name, requires: mReq });
  });
  // we know all requirements...
  // sort modules from top to bottom
  // max passes:
  let pass = modulesTable.length;
  // queue of names
  let queue = Array.from(internal.keys());
  //
  while (sortTable.length * pass > 0) {
    // console.log("pass", pass, sortTable.length);
    //}|| sortTable.length > 0) {
    pass--;
    // find
    sortTable.forEach((e) => {
      e.requires = e.requires.filter((s) => {
        return queue.indexOf(s) == -1;
      });
      if (e.requires.length == 0) {
        queue.push(e.name);
      }
    });
    // remove "loaded"
    sortTable = sortTable.filter((e) => e.requires.length != 0);
  }
  // log.info("Sort passes:", modulesTable.length - pass);
  // if something is left
  if (sortTable.length > 0) {
    let not_found = sortTable.reduce((a, e) => {
      return a.concat(e.requires);
    }, []);
    log.warn("Some components are not loaded:");
    log.warn(
      "can not satisfy requirements for",
      sortTable
        .map((e) => e.name)
        .sort()
        .join(", "),
    );
    log.warn("Not found:", not_found.sort().join(", "));
    // if nothing is left, everything is ok (for now)
  } else {
    log.info(
      "Components load order established. Passes:",
      modulesTable.length - pass,
    );
    // log.info(queue.join(", "));
  }
  sortTable = null;

  // load modules in order
  // and save information
  // //
  let mDict = modulesTable.reduce((a, e) => {
    a[e.name] = e;
    return a;
  }, {}); //
  let ord = 1;
  queue.forEach((n) => {
    if (internal.has(n)) return;
    // environment
    // for the newborn
    let require = myRequire;
    let console = { log: log.info, error: log.error, info: log.info };
    let module = { exports: {} };
    //
    eval(mDict[n].src);
    loaded.set(n, {
      exports: module.exports,
      js: true,
      name: n,
      exported: new Set(Object.keys(module.exports)),
      requires: mDict[n].requires,
      order: ord, //queue.indexOf(n)
      // src: mDict[n].src,
    });
    ord++;
    log.info(n, "loaded.");
  });
  // console.log(loaded);
  //
  // build lookup dictionary of exported entities
  loaded.values().reduce((a, e) => {
    for (let E of e.exported) {
      a[E] = e.name;
    }
    return a;
  }, lookup);
  // modulesTable = null;
  // mDict = null; // helps gc? NO
  // create table and save for client
  // !!!
  saveGlobalData4JS(
    "components",
    "modules",
    Array.from(loaded.values()).map((e) => {
      let row = Object.assign({}, e);
      delete row.exports; // remove code
      // delete row.src;
      row.exported = Array.from(row.exported); // set->array
      return row;
    }),
  );
  saveGlobalData4JS("components", "functions", lookup);
  // save modules
  loaded.values().forEach((v) => {
    const src = wrapForWeb(mDict[v.name].src, v.name);
    let name = v.name;
    saveLib("modules/" + name, src);
  });
}
