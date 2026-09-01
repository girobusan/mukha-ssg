const preact = require("preact");
const hooks = require("preact/hooks");
const htm = require("htm/preact");

const internal = new Map([
  ["preact", { exports: preact, order: 0 }], //module!!
  ["preact/hooks", { exports: hooks, order: 0 }],
  ["htm/preact", { exports: htm, order: 0 }],
  ["mukha-system", { exports: { static_render: false } }],
  ["do-not-hydrate", { exports: { msg: "How did you get here?" }, order: 256 }], //
]);

const loaded = new Set();

export function webRequire(n) {}

export function registerModule(c) {}

export async function webInitComponents(
  getGlobalDataFn,
  attachResourceFn,
  relative,
  currentLoc,
) {
  console.info("Checking for web components...");
  const elements = Array.from(
    document.querySelectorAll(".Mukha_hydration_required"),
  ).map((e) => {
    return { element: e };
  });
  if (elements.length === 0) return; // ?
  // populate system module
  internal.get("mukha-system").set("location", currentLoc);
  // load  all know modules data
  const modules = await getGlobalDataFn("modules", "components");
  console.log(modules);
  const functions = await getGlobalDataFn("functions", "components");
  const assets = await getGlobalDataFn("assets", "components");
  //
  // gather dehydrated
  // component functions
  const components = elements.map((e) => e.dataset["component-name"]);

  // load props
  //
  const props = new Map(); // pid || enc => object
  elements.forEach((el) => {
    const pid = el.element.dataset["props-id"];
    const enc = el.element.dataset["props-encoded"];
    if (!pid && !enc) {
      return; // no props at all?
    }
    enc && props.set(enc, JSON.parse(decodeURI(enc)));
    pid && props.set(pid, getGlobalDataFn(pid, "component/props"));
  });
  await Promise.all(props.values());

  // load components and requirements
  // which modules do we have to load first
  const userModulesSet = new Set(
    components
      .map((e) => {
        const M = functions[e];
        if (!M) console.log("Module for component not found:", e);
        return M;
      })
      .filter((f) => f),
  );
  // gather deps
  while (true) {
    let startSize = userModulesSet.size();
    for (let M of userModulesSet) {
      // add all deps of M to set
      //
    }
    if (userModulesSet.size === startSize) break;
  }
  // hydrate
  //
}
