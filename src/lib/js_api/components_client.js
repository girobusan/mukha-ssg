const preact = require("preact");
const hooks = require("preact/hooks");
const htm = require("htm/preact");

const internal = new Map([
  ["preact", { exports: preact, order: 0 }], //module!!
  ["preact/hooks", { exports: hooks, order: 0 }],
  ["htm/preact", { exports: htm, order: 0 }],
  // ["do-not-hydrate", false], //
]);

const loaded = new Set();

export function webRequire(n) {}

export function registerComponent(c) {}

export async function webInitComponents(
  getDataFn,
  attachResourceFn,
  relative,
  currentLoc,
) {
  console.info("Checking for web components...");
  const elements = Array.from(
    document.querySelectorAll(".Mukha_hydration_required"),
  );
  if (elements.length === 0) return; // ?
  // load modules data
  const modules = await getDataFn("modules", "components");
  console.log(modules);
  const functions = await getDataFn("functions", "components");
  const assets = await getDataFn("assets", "components");
  const props = new Map();
  //
  // gather dehydrated
  // component functions
  const components = elements.map((e) => e.dataset["component-name"]);

  // load props
  elements.forEach((el) => {
    const pid = el.dataset["props-id"];
    pid && props.set(pid, getDataFn(pid, "component/props"));
  });
  await Promise.all(props.values());

  // load components and requirements
  // hydrate
  //
}
