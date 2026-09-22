import { posix as path } from "path-browserify";
import { banertype, wlog, setLevel } from "./frontend/wlog";
import { webRequire, webInitComponents } from "./frontend/components-fns";
import { readObj } from "./frontend/read-obj.js";

import { relative, resolveAbsPath } from "./frontend/web-path-ops.js";
import { attachResource as AR } from "./frontend/attach-resource.js";
import { createPromisingLoader, _pocb } from "./frontend/pack-loader.js";

(async function() {
  if (window.Mukha) {
    return;
  } // dont

  const siteData = "@DATA@";
  const myLocation = document.currentScript.dataset.location;
  // test

  //
  banertype("Mukha JS API client", VERSION, "at", myLocation);
  console.info("Preact version", PREACTVER);
  setLevel("@LOGLEVEL@" || 4);
  //
  //
  const attachResource = (p, t) => AR(p, t, myLocation);
  const packLoader = createPromisingLoader(myLocation, 10000);
  //
  let pageData = null;
  let dCont = document.getElementById("mukha_page_data");
  if (dCont) pageData = JSON.parse(dCont.innerHTML);
  //
  function uncompact(tobj) {
    const tout = [];
    tobj.rows.forEach((rw) => {
      tout.push(
        tobj.cols.reduce((a, e, i) => {
          a[e] = rw[i];
          return a;
        }, {}),
      );
    });
    return tout;
  }

  var DataStore = {};
  function dataFilePath(ns, name) {
    if (ns.startsWith("/")) {
      //local
      return "/_js/data/local" + ns + "/" + name + ".js";
    }
    return "/_js/data/global/" + ns + "/" + name.replace(/\./g, "/") + ".js";
  }
  //
  async function registerData(ns, dname, dt, compacted) {
    // console.log("registering", ns, dname);
    if (DataStore[ns] && DataStore[ns][dname]) {
      wlog.debug("Already registered:", ns, dname);
      return;
    }
    if (!DataStore[ns]) DataStore[ns] = {};
    DataStore[ns][dname] = compacted ? uncompact(dt) : dt;
  }
  //
  async function getData(name, ns) {
    if (DataStore[ns] && DataStore[ns][name]) {
      return DataStore[ns][name];
    }
    let dataP = dataFilePath(ns, name);
    wlog.debug("...requesting data", dataP);
    await packLoader(dataP).then((r) => r(registerData));
    return DataStore[ns][name]; // return requestData(dataP);
  }
  function getPageData(name, ns) {
    wlog.debug("Getting local", ns, name);
    if (!pageData) return null;
    let namespace = ns || "page";
    return readObj([namespace, name].join("."), pageData);
  }

  function retrieveLib(lpath, libId) {
    // Promise!
    return packLoader(
      libId || lpath,
      relative(myLocation, path.join("/_js/lib", lpath)),
    );
  }

  //
  //
  // API
  window.Mukha = {
    permalink: myLocation,
    registerData: registerData,
    relPath: (f, t) => (t ? relative(f, t) : relative(myLocation, f)),
    absPath: (f, t) =>
      t ? resolveAbsPath(f, t) : resolveAbsPath(myLocation, f),
    relTo: (t) => relative(myLocation, t),
    attachScript: (...args) => {
      return attachResource(...args);
    },
    getLocalData: function(name, ns) {
      return getPageData(name, ns);
    },
    // THINK:
    getData: function(name, ns) {
      let nspace = ns ? ns : "datasets";
      return getData(name, nspace);
    },
    retrieveLib: retrieveLib,
    // register module container function
    _rmc: (...args) => {
      console.warn("_rmc must be changed to _pocb since september!");
      _pocb(...args);
    }, //registerModuleFn, //
    _pocb: _pocb, //registerModuleFn, //
    // THINK: ↓ not required ↓
    require: webRequire,
  };
  window._M = window.Mukha;
  //
  // init components
  webInitComponents(getData, attachResource, retrieveLib, relative, myLocation);
  //
})();
