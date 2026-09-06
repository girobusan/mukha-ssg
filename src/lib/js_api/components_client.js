const preact = require("preact");
const hooks = require("preact/hooks");
const htm = require("htm/preact");
import { posix as path } from "path-browserify";

// const MAPI = window.Mukha;

const internal = new Map([
  ["preact", { exports: preact, order: 0 }], //module!!
  ["preact/hooks", { exports: hooks, order: 0 }],
  ["htm/preact", { exports: htm, order: 0 }],
  [
    "mukha-system",
    { exports: { module_state: "frontend", static_render: false } },
  ],
  ["do-not-hydrate", { exports: { msg: "How did you get here?" }, order: 0 }], //
]);

const loaded = new Map();
const assets = new Map();

function resolveModule(callee, pathname) {
  //
  let r = pathname;
  if (pathname.startsWith(".")) {
    r = path.resolve("/" + path.dirname(callee), pathname).replace(/^\//, "");
  }
  console.log(callee, "→", pathname, "resolved to", r);
  return r;
}

export function webRequire(n, callee) {
  let moduleName = n;
  if (callee) {
    moduleName = resolveModule(callee, n);
  }
  // is JS module
  let M = internal.get(moduleName) || loaded.get(moduleName);
  if (M) {
    return M.exports;
  }
  // Asset?
  M = assets.get(moduleName);
  // not anything known
  if (!M) {
    console.log(assets);
    console.error("Module not loaded:", moduleName);
    return null;
  }
  //load asset
  let assetPath = assets.get(moduleName).site_path;
  if (assetPath && moduleName.match(/\.css$/i)) {
    window.Mukha.attachScript(assetPath, "css");
  }
  return assetPath;
}

let moduleEvts = {};
function loadModule(n) {
  if (!moduleEvts[n]) moduleEvts[n] = [];
  //
  return new Promise((res, rej) => {
    moduleEvts[n].push(res);
    window.Mukha.retrieveLib("components/" + n).catch((e) => rej(e));
  });
}

export function registerModule(name, exports) {
  console.log("Registering module", name);
  loaded.set(name, { exports: exports });
  if (moduleEvts[name]) {
    moduleEvts[name].forEach((evt) => {
      evt(exports);
    });
  } else {
    console.log("No notifications sent");
  }
}

export async function webInitComponents(
  getGlobalDataFn,
  attachResourceFn,
  retrieveLibFn,
  relative,
  currentLoc,
) {
  console.info("Checking for components...");
  const elements = Array.from(
    document.querySelectorAll(".Mukha_hydration_required"),
  ).map((e) => {
    return {
      element: e,
      component: e.dataset.componentName,
      cid: e.dataset.componentId,
      propsEnc: e.dataset.propsEncoded,
      propsID: e.dataset.propsId,
      props: {},
    };
  });
  if (elements.length === 0) {
    console.info("No components used.");
    return;
  }
  //
  // populate system module
  //
  internal.get("mukha-system")["location"] = currentLoc;
  //
  // load  all know modules data
  //
  const modules = await getGlobalDataFn("modules", "components");
  var modDict = modules.reduce((a, e) => {
    a[e.name] = e;
    return a;
  }, {});
  // console.log(modules);
  const functions = await getGlobalDataFn("functions", "components");
  const assetsobj = await getGlobalDataFn("assets", "components");
  // console.log("assets table", assetsobj);
  Object.keys(assetsobj).forEach((a) => assets.set(a, assetsobj[a]));
  //
  // gather dehydrated
  // component functions
  // dataset

  // load props
  //
  elements.forEach((e) => {
    if (e.propsEnc) {
      e.props = JSON.parse(decodeURI(e.propsEnc));
    }
    if (e.propsID) {
      e.props = getGlobalDataFn(e.propsID, "component/props");
    }
  });
  await Promise.all(elements.map((e) => e.props));

  // load components and requirements
  // which modules do we have to load first
  const userModulesSet = new Set(
    elements
      .map((e) => {
        const M = functions[e.component];
        if (!M) console.log("Module for component not found:", e.component);
        return M;
      })
      .filter((f) => f),
  );
  // gather deps
  let previousSize;
  let iter = 1024; // Max iteration count
  do {
    previousSize = userModulesSet.size;
    for (let M of userModulesSet) {
      if (internal.has(M)) continue;
      // add all deps of M to set
      console.log(M);
      let req = [];
      if (modDict[M] && modDict[M].requires) {
        // not asset nor internal
        req = modDict[M].requires;
      }
      // console.log(M, "needs", req);

      req.forEach((dep) => userModulesSet.add(dep));
      //
    }
    iter--;
    if (iter === 0) {
      console.error("Max iteration count exceed.");
      break;
    }
  } while (userModulesSet.size !== previousSize); // && iter > 0);
  //
  let ordered = Array.from(userModulesSet)
    .filter((e) => !internal.has(e))
    .filter((e) => !assets.has(e))
    .sort((a, b) => {
      return (modDict[a]?.order || 0) - (modDict[b]?.order || 0);
    });

  console.log("Load for this page", ordered);
  // actually, load
  for (let i = 0; i < ordered.length; i++) {
    console.log(i + 1, "—", ordered[i]);
    await loadModule(ordered[i]);
  }

  // hydrate all!
  elements.forEach(async (e) => {
    console.log("Hydrating", e);
    const node = e.element;
    console.log(node);
    // const component = [e.component];
    let module = loaded.get(functions[e.component]);
    console.log(module);
    let componentFn = module.exports[e.component];
    console.log(componentFn);
    let props = {};
    if (e.propsEnc) {
      props = JSON.parse(decodeURI(e.propsEnc));
    }
    if (e.propsID) {
      // load props from filr
      props = await window.Mukha.getData(e.propsID, "components/props");
    }
    preact.hydrate(preact.h(componentFn, props), node);
  });
  //
}
