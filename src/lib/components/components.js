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
const internal = {
  preact: { exports: preact }, //module!!
  "preact/hooks": { exports: hooks },
  "preact/compat": { exports: compat },
  "htm/preact": { exports: htm },
};
const loaded = {};
const lookup = {};
const assets = {};
//

function myRequire(n) {
  let name = normalizeName(n);
  let M = internal[name] || loaded[name];
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
  if (!loaded[module_name]) {
    console.error("Can not find module", module_name, "with exported", fn_name);
    return null;
  }
  return loaded[module_name].exports[fn_name];
}
//
export function createElement(fn_name, props) {
  let fn = findFunction(fn_name); // returns content of module.exports[fn_name]
  return preact.h(fn, props);
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
  let queue = Object.keys(internal);
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
  log.info("Sort passes:", modulesTable.length - pass);
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
    log.info("Components load order established.");
    // log.info(queue.join(", "));
  }

  // load modules in order
  let mDict = modulesTable.reduce((a, e) => {
    a[e.name] = e;
    return a;
  }, {});
  queue.forEach((n) => {
    if (internal[n]) return;
    // environment
    // for the newborn
    let require = myRequire;
    let console = { log: (...args) => log.info(n + ":", ...args) };
    let module = { exports: {} };
    //
    eval(mDict[n].src);
    loaded[n] = {
      exports: module.exports,
      name: n,
      exported: new Set(Object.keys(module.exports)),
      requires: mDict[n].requires,
    };
    log.info(n, "loaded.");
  });
  //
  // build lookup dictionary of exported entities
  Object.values(loaded).reduce((a, e) => {
    for (let E of e.exported) {
      a[E] = e.name;
    }
    return a;
  }, lookup);
  // create table for saving to client
  // !!!
}
