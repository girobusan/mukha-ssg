const path = require("node:path").posix;
const vm = require("node:vm");
import { renderToString } from "preact-render-to-string";
import {
  copyToLib,
  saveGlobalData4JS,
  saveLocalData4JS,
  saveLib,
} from "../js_api";
import { findRequires, normalizeName } from "./comp_util";
import { wrapForWeb } from "./web_template.js";
import { stringify2JSON } from "../util/base.js";
import { longHash, shortHash } from "../util/hashes.js";
import { getLogger } from "../logging";
var log = getLogger("comps");
//
const preact = require("preact");
const hooks = require("preact/hooks");
const htm = require("htm/preact");
/*
const { useState } = hooks;
const { h, render } = preact;
const { html } = htm;
*/
// cache
const rehydrationCache = new Map();
//
// dicts
//
// modules, which are preloaded
const internal = new Map([
  ["preact", { exports: preact }], //module!!
  ["preact/hooks", { exports: hooks }],
  ["htm/preact", { exports: htm }],
  ["do-not-hydrate", false], //
  [
    "mukha-system",
    { exports: { mosule_state: "loading", static_render: true, test: "nope" } },
  ],
]);
// user modules
const loaded = new Map();
// assets from components folder
const assets = new Map();
// function (component) lookup table
// function name -> name of module, which exports it
const lookup = new Map();
//
//
function resolveModule(callee, pathname) {
  // return pathname;
  //
  let r = pathname;
  if (pathname.startsWith(".")) {
    r = path.resolve("/" + path.dirname(callee), pathname);
  }
  log.debug(callee, "→", pathname, "resolved to", r);
  return r;
}

function myRequire(n, callee) {
  let moduleName = n;
  if (moduleName === "do-not-hydrate") {
    return;
  }
  // let name = normalizeName(moduleName);
  if (callee) {
    moduleName = resolveModule(callee, n);
  }
  let M = internal.get(moduleName) || loaded.get(moduleName);
  if (!M) {
    // TODO: more checks, maybe, return SITE path instead
    return assets.has(moduleName) ? assets.get(moduleName).path : null;
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

export function isRehydrated(fn_name) {
  const cached = rehydrationCache.get(fn_name);
  if (cached) return cached;
  let result = true;
  //
  let module_name = lookup.get(fn_name);
  let module = loaded.get(module_name);
  if (module.requires.indexOf("do-not-hydrate") != -1) {
    result = false;
  } // name of the module
  rehydrationCache.set(fn_name, result);
  return result;
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

const componentIDs = {};
export function renderComponentToString(fn_name, props = {}, context) {
  internal.get("mukha-system").module_state = "static";
  // let __H = 1;
  let element = preact.h(findFunction(fn_name), props);
  let props_to_save;
  let props_id = "";
  let tag_open = "";
  let tag_close = "";
  let html = "";
  //
  const c_page = context.ctx.page.permalinkl;
  // increment
  const component_id = componentIDs[c_page] ? componentIDs[c_page] + 1 : 1;
  componentIDs[c_page] = component_id;

  if (isRehydrated(fn_name)) {
    const props_map = new Map([
      ["data-component-name", fn_name],
      ["data-component-id", component_id],
      ["data-do-rehydrate", true],
    ]);
    // save props if any
    if (props && Object.keys(props).length > 0) {
      props_to_save = stringify2JSON(props);
      if (props_to_save.length < 120) {
        props_map.set("data-props-encoded", encodeURI(props_to_save));
      } else {
        props_id = longHash(props_to_save);
        props_map.set("data-props-id", props_id);

        saveGlobalData4JS("components/props", props_id, props);
      }
    } // end saving props
    const prop_string = Array.from(props_map.entries())
      .map((p) => `${p[0]}="${p[1]}"`)
      .join(" ");
    tag_open = `<span class="Mukha_hydration_required" ${prop_string}>`;
    tag_close = "</span>";
  } // end rehydration specific code
  //
  try {
    // console.log("render to string NOW", component_id);
    // tanpering with system module
    let sys = internal.get("mukha-system").exports;
    sys.page = context.ctx.page; // won't be awailable on frontentd ANYway
    sys.cid = component_id; // won't work on frontend THIS way
    sys.location = context.ctx.page.permalink;
    sys.data = {
      // save local data for this particular component
      saveLocal: (name, data) => {
        saveLocalData4JS(name, data, sys.location + "/" + "c" + component_id);
      },
      // loadLocal: (name)=>{ } is not available here
      // load global data
    };
    //
    html = renderToString(element);
  } catch (e) {
    log.error("Can not render to string:", e);
    html = e;
  }
  return tag_open + html + tag_close;
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
  // clear cache
  rehydrationCache.clear();
  //test
  const modulesTable = [];
  let sortTable = [];
  //
  flist.forEach((f) => {
    let modname = f.dir ? f.dir.replace(/^\//, "") + "/" + f.name : f.name;
    if (!f.name.match(/\.(m|c)?js$/i)) {
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
      resolveModule(modname, e),
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
  const makeLog =
    (n, what) =>
      (...args) =>
        log[what](n + ":", ...args);
  queue
    .filter((n) => !internal.has(n))
    .forEach((n) => {
      // environment
      // for the newborn
      let env = {
        require: myRequire,
        console: {
          log: makeLog(n, "info"),
          error: makeLog(n, "error"),
          info: makeLog(n, "info"),
        },
        module: { exports: {} },
      };

      //
      try {
        vm.runInContext(tmp_modules_dict[n].src, vm.createContext(env));

        loaded.set(n, {
          exports: env.module.exports,
          js: true,
          name: n,
          exported: new Set(Object.keys(env.module.exports)),
          requires: tmp_modules_dict[n].requires,
          order: ord, //queue.indexOf(n)
          // src: mDict[n].src,
        });
        log.info(n, "loaded.");
      } catch (e) {
        log.error("Can not load module", n, e);
      }
      //
      ord++;
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
  // save assets info
  saveGlobalData4JS(
    "components",
    "assets",
    Object.fromEntries(assets.entries()),
  );
}
