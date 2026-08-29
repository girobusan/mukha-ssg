const path = require("node:path").posix;
import { renderToString } from "preact-render-to-string";
import { copyToLib, saveGlobalData4JS, saveLib } from "../js_api";
import { findRequires, normalizeName } from "./comp_util";
import { wrapForWeb } from "./web_template.js";
import { longHash, stringify2JSON } from "../util.js";
import { getLogger } from "../logging";
var log = getLogger("comps");
//
const preact = require("preact");
const hooks = require("preact/hooks");
const htm = require("htm/preact");
//
const { useState } = hooks;
const { h, render } = preact;
const { html } = htm;

//
// dicts
//
// modules, which are preloaded
const internal = new Map([
  ["preact", { exports: preact }], //module!!
  ["preact/hooks", { exports: hooks }],
  ["htm/preact", { exports: htm }],
]);
// user modules
const loaded = new Map();
// assets from components folder
const assets = new Map();
// function (component) lookup table
// function name -> name of module, which exports it
const lookup = new Map();
//

function myRequire(n) {
  let name = normalizeName(n);
  let M = internal.get(name) || loaded.get(name);
  if (!M) {
    // TODO: more checks, maybe, return SITE path instead
    return assets.has(n) ? assets.get(n).path : null;
  }
  return M.exports;
}
//
export function findFunction(fn_name) {
  // find component...
  let module_name = lookup.get(fn_name); // name of the module
  if (!module_name) {
    console.error("Can not find any module with exported", fn_name);
    return null;
  }
  let M = loaded.get(module_name);
  if (!M) {
    console.error("Can not find module", module_name, "with exported", fn_name);
    return null;
  }
  const r = M.exports[fn_name];
  // console.log("found function?" , )
  return r;
}
//
export function createElement(fn_name, props) {
  const MUKHA_STRING_RENDER = true;
  let fn = findFunction(fn_name); // returns content of module.exports[fn_name]
  try {
    return preact.h(fn, props);
  } catch (e) {
    log.error("Can not create element: ", e);
  }
}

export function renderComponentToString(fn_name, props) {
  // let __H = 1;
  let element = preact.h(findFunction(fn_name), props);
  let props_to_save;
  let props_id = "";
  let tag_open = "";
  let tag_close = "";
  // let html = "";

  try {
    // save props
    // wrap
    if (props && Object.keys(props).length > 0) {
      props_to_save = stringify2JSON(props);
      props_id = longHash(props_to_save);
      saveGlobalData4JS("components/props", props_id, props_to_save);
    }
    tag_open = `<span class="Mukha_hydration_required" data-hydrate="true" 
data-component-name="${fn_name}" 
data-props-id="${props_id}">`;
    tag_close = "</span>";

    return tag_open + renderToString(element, { __H: true }) + tag_close;
  } catch (e) {
    log.error("Can not render to string:", e);
  }
}
//
// Components initialization
//
export function initComponents(flist) {
  log.info("Init components...");
  if (!flist || flist.length == 0) {
    log.info("Components wasnt used.");
    return;
  }
  //clear all components data
  loaded.clear();
  assets.clear();
  lookup.clear(); //  = {};
  //test
  const modulesTable = [];
  let sortTable = [];
  //
  flist.forEach((f) => {
    let modname = f.dir ? f.dir.replace(/^\//, "") + "/" + f.name : f.name;
    if (!f.name.match(/\.(m|c)?js$/)) {
      assets.set(modname, {
        path: modname,
        src_path: f.src,
        dir: f.dir,
        name: f.name,
      });
      log.info("Asset:", f.name);
      return;
    }
    const module_src = f.getContent();
    log.info("Module", modname);
    const module_requires = findRequires(module_src).map((e) =>
      normalizeName(e),
    );
    if (module_requires) log.info("requires:", module_requires);
    modulesTable.push({
      name: modname,
      requires: module_requires,
      src: module_src,
    });
    sortTable.push({ name: modname, requires: module_requires });
  });
  // we know all requirements...
  // sort modules from top to bottom
  //
  // count passes:
  let pass = 0;
  // queue of names
  const queue = Array.from(internal.keys());
  //
  while (sortTable.length > 0) {
    pass++;
    const queueAtStart = queue.length;
    // find
    sortTable.forEach((e) => {
      e.requires = e.requires.filter((s) => {
        return queue.indexOf(s) == -1;
      });
      if (e.requires.length == 0) {
        queue.push(e.name);
      }
    });
    sortTable = sortTable.filter((e) => e.requires.length != 0);
    if (queue.length === queueAtStart) {
      break;
    }
  }
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
    log.warn("Not found or circular deps:", not_found.sort().join(", "));
    // if nothing is left, everything is ok (for now)
  } else {
    log.info("Components load order established. Passes:", pass);
    // log.info(queue.join(", "));
  }
  sortTable = null;

  // load modules in order
  // and save information
  //
  // lookup dict
  let tmp_modules_dict = modulesTable.reduce((a, e) => {
    a[e.name] = e;
    return a;
  }, {}); //
  //
  let ord = 1;
  queue
    .filter((n) => !internal.has(n))
    .forEach((n) => {
      // environment
      // for the newborn
      let require = myRequire;
      let console = { log: log.info, error: log.error, info: log.info };
      let module = { exports: {} };
      //
      eval(tmp_modules_dict[n].src); // TODO: use vm here
      //
      loaded.set(n, {
        exports: module.exports,
        js: true,
        name: n,
        exported: new Set(Object.keys(module.exports)),
        requires: tmp_modules_dict[n].requires,
        order: ord, //queue.indexOf(n)
        // src: mDict[n].src,
      });
      ord++;
      log.info(n, "loaded.");
    });
  // console.log(loaded);
  //
  // populate lookup dictionary of exported entities
  loaded.values().reduce((a, e) => {
    for (let E of e.exported) {
      a.set(E, e.name);
    }
    return a;
  }, lookup);
  // modulesTable = null;
  // mDict = null;
  //
  // create table and save for client
  saveGlobalData4JS(
    "components",
    "modules",
    Array.from(loaded.values()).map((e) => {
      let row = Object.assign({}, e);
      delete row.exports; // remove code
      row.exported = Array.from(row.exported); // set->array
      return row;
    }),
  );
  saveGlobalData4JS(
    "components",
    "functions",
    Object.fromEntries(lookup.entries()),
  );
  // save modules and assets
  loaded.forEach((l) => {
    const src = wrapForWeb(tmp_modules_dict[l.name].src, l.name);
    let name = l.name;
    saveLib("components/" + name, src);
  });
  assets.forEach((a) => {
    a.site_path = copyToLib(a.src_path, "components/" + a.path);
  });
}
