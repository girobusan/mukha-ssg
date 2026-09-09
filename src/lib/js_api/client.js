// async load of clobal datasets
// ns global (from data module)
// ns system (system data; search)
// async load of local datasets
import { posix as path } from "path-browserify";
import { banertype, wlog, setLevel } from "./wlog";
import {
  webRequire,
  webInitComponents,
  registerModule,
} from "./components_client";

(function() {
  if (window.Mukha) {
    return;
  } // dont
  const siteData = "@DATA@";

  const myLocation = document.currentScript.dataset.location;
  banertype("Mukha JS API client", VERSION);
  banertype("at", myLocation);
  setLevel("@LOGLEVEL@" || 4);
  //
  function relative(from, to) {
    return path.relative(path.dirname(from), to);
  }
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
  var Components = {};
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

  let attached = new Set();

  function attachResource(url, atag) {
    let tg = atag || "script";
    wlog.debug("Attaching:", url, "as", tg);
    let relp;
    let absp;
    // is local?
    if (url.startsWith("/")) {
      absp = url;
      relp = relative(myLocation, absp);
    }
    // is relative?
    else if (url.startsWith(".")) {
      relp = url;
      absp = path.resolve(myLocation, relp);
    }
    // it's not local at all
    else if (url.match(/^(https:|http:|ftp:|ssh:)/)) {
      relp = url;
      absp = url;
      // assuming relative!
    } else {
      relp = url;
      absp = path.resolve(myLocation, relp);
    }

    if (attached.has(absp)) {
      wlog.warn("Already attached:", absp);
      return Promise.resolve(true);
    }
    attached.add(absp);

    const tag = tg === "script" ? "script" : "link";
    const attr = tg === "script" ? "src" : "href";
    const rel = tg === "script" ? false : "stylesheet";
    return new Promise((res, rej) => {
      let st = document.createElement(tag);
      rel && st.setAttribute("rel", rel);
      if ("onload" in st) {
        st.addEventListener("load", () => res("LOADED"));
        st.addEventListener("error", () => rej("NOT LOADED"));
      } else {
        res(true);
      }
      document.head.appendChild(st);
      st.setAttribute(attr, relp);
    });
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
    // :TODO: redo?
    permalink: myLocation,
    registerData: registerData,
    relpath: relative,
    relTo: (t) => relative(myLocation, t),
    attachScript: (...args) => {
      return attachResource(...args);
    },
    getLocalData: function(name, ns) {
      // REVIEW:
      let nspace = ns ? ns : myLocation;
      return getData(name, nspace);
    },
    getData: function(name, ns) {
      let nspace = ns ? ns : "datasets";
      return getData(name, nspace);
    },
    retrieveLib: retrieveLib,
    registerModule: registerModule,
    require: webRequire,
  };
  window._M = window.Mukha;
  //
  // init components
  webInitComponents(getData, attachResource, retrieveLib, relative, myLocation);
  //
})();
