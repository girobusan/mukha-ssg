const clientCode = require("../../../dist/js_api_client.js?raw");
let data = {};

function data2js(nsname, data) {
  const json = JSON.stringify(data);
  return `window.Mukha.registerData("${nsname}" , ${json} )`;
}

export function saveData4JS(nsname, dt) {
  data[nsname] = dt;
  console.log("saved", data);
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
