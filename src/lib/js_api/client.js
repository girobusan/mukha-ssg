// async load of clobal datasets
// ns global (from data module)
// ns system (system data; search)
// async load of local datasets
import { posix as path } from "path-browserify";
import { banertype, wlog, setLevel } from "./frontend/wlog";
import {
  webRequire,
  webInitComponents,
  registerModule,
  registerModuleFn,
} from "./frontend/components-fns";

import { relative, resolveAbsPath } from "./frontend/web-path-ops.js";
import { attachResource as AR } from "./frontend/attach-resource.js";

(function() {
  if (window.Mukha) {
    return;
  } // dont
  const siteData = "@DATA@";

  const myLocation = document.currentScript.dataset.location;
  const attachResource = (p, t) => AR(p, t, myLocation);
  banertype("Mukha JS API client", VERSION, "at", myLocation);
  console.info("Preact version", PREACTVER);
  setLevel("@LOGLEVEL@" || 4);
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
  function registerData(ns, dname, dt, compacted) {
    let dpath = dataFilePath(ns, dname);
    //save data!
    if (DataStore[ns] && DataStore[ns][dname]) {
      return;
    }
    if (!DataStore[ns]) DataStore[ns] = {};
    DataStore[ns][dname] = compacted ? uncompact(dt) : dt;
    if (requested[dpath]) requested[dpath](DataStore[ns][dname]);
  }
  //
  function getData(name, ns) {
    if (DataStore[ns] && DataStore[ns][name]) {
      return Promise.resolve(DataStore[ns][name]);
    }
    let dataP = dataFilePath(ns, name);
    wlog.debug("...requesting data", dataP);
    return requestData(dataP);
  }

  function retrieveLib(lpath) {
    return attachResource(relative(myLocation, path.join("/_js/lib", lpath)));
  }

  let requested = {};
  function requestData(jspath) {
    //TODO: rewrite
    wlog.debug("Sending request:", jspath);
    return new Promise((res, rej) => {
      attachResource(jspath).catch((e) => {
        wlog.error("Can not load data from", sc, e);
        rej("Can not attach");
      });
      requested[jspath] = (d) => {
        // save data => register funtion
        delete requested[jspath];
        wlog.debug("Data recieved:", d);
        res(d);
      };
    });
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
      // REVIEW:
      let nspace = ns ? ns : myLocation;
      return getData(name, nspace);
    },
    // THINK:
    getData: function(name, ns) {
      let nspace = ns ? ns : "datasets";
      return getData(name, nspace);
    },
    retrieveLib: retrieveLib,
    // register module container function
    _rmc: registerModuleFn, //
    // THINK: ↓ not required ↓
    require: webRequire,
  };
  window._M = window.Mukha;
  //
  // init components
  webInitComponents(getData, attachResource, retrieveLib, relative, myLocation);
  //
})();
