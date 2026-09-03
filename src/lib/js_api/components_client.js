const preact = require("preact");
const hooks = require("preact/hooks");
const htm = require("htm/preact");

const internal = new Map([
  ["preact", { exports: preact, order: 0 }], //module!!
  ["preact/hooks", { exports: hooks, order: 0 }],
  ["htm/preact", { exports: htm, order: 0 }],
  ["mukha-system", { exports: { static_render: false } }],
  ["do-not-hydrate", { exports: { msg: "How did you get here?" }, order: 0 }], //
]);

const loaded = new Set();

export function webRequire(n) { }

export function registerModule(c) { }

export async function webInitComponents(
  getGlobalDataFn,
  attachResourceFn,
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
  const modDict = modules.reduce((a, e) => {
    a[e.name] = e;
    return a;
  }, {});
  console.log(modules);
  const functions = await getGlobalDataFn("functions", "components");
  const assets = await getGlobalDataFn("assets", "components");
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
      const req = modDict[M].requires || [];
      console.log(M, "needs", req);

      req.forEach((dep) => userModulesSet.add(dep));
      //
    }
    iter--;
    if (iter === 0) {
      console.error("Max iteration count exceed.");
      break;
    }
    console.log("size after:", userModulesSet.size);
  } while (userModulesSet.size !== previousSize); // && iter > 0);
  //
  let ordered = Array.from(userModulesSet)
    .filter((e) => internal.has(e))
    .sort((a, b) => modDict[a].order - modDict[b].order);

  console.log("Load for this page", ordered);
  // hydrate
  //
}
