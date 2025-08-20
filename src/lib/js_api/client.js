// async load of clobal datasets
// ns global (from data module)
// ns system (system data; search)
// async load of local datasets
import { posix } from "path-browserify";

(function() {
  if (window.Mukha) {
    return;
  } // dont
  const siteData = "@DATA@";

  const myLocation = document.currentScript.dataset.location;
  console.info("Mukha JS API client", VERSION, "at", myLocation);
  //
  function relative(from, to) {
    return posix.relative(posix.dirname(from), to);
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

  var requested = {};
  var DataStore = {};
  function dataFilePath(ns, name) {
    if (ns.startsWith("/")) {
      //local
      return "/_js/data/local" + ns + "/" + name + ".js";
    }
    return "/_js/data/global/" + ns + "/" + name.replace(/\./g, "/") + ".js";
  }
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
  function getData(name, ns) {
    if (DataStore[ns] && DataStore[ns][name]) {
      return Promise.resolve(DataStore[ns][name]);
    }
    let dataP = dataFilePath(ns, name);
    return requestData(dataP);
  }
  function requestData(jspath) {
    return new Promise((res, rej) => {
      let sc = document.createElement("script");
      sc.addEventListener("error", () => rej("no data"));
      document.body.appendChild(sc);
      sc.src = relative(myLocation, jspath);
      requested[jspath] = (d) => {
        // save data => register funtion
        delete requested[jspath];
        res(d);
      };
    });
  }

  window.Mukha = {
    // :TODO: redo
    registerData: (ns, name, dt, compact) => {
      return registerData(ns, name, dt, compact);
    },
    // registerLocalData: (path, name, dt, compact) => {
    //   let key = path + "/" + name;
    //   let dts = compact ? uncompact(dt) : dt;
    //   if (localDataRqsts[key]) {
    //     localDataRqsts[key](dts);
    //     delete localDataRqsts[key];
    //     return;
    //   }
    //   console.warn("Unrequested local dataset:", key);
    //   if (!localData[path]) localData[path] = {};
    //   localData[path][name] = dts;
    // },
    relpath: (f, t) => relative(f, t),
    relTo: (t) => relative(myLocation, t),
    attachScript: (url) => {
      console.info("jsapi: Attaching:", url);
      return new Promise((res, rej) => {
        let st = document.createElement("script");
        st.addEventListener("load", res);
        st.addEventListener("error", rej);
        document.body.appendChild(st);
        st.setAttribute("src", url);
      });
    },
    permalink: myLocation,
    getLocalData: function(name, ns) {
      let nspace = ns ? ns : myLocation;
      return getData(name, nspace);
    },
    getData: function(name, ns) {
      let nspace = ns ? ns : "datasets";
      return getData(name, nspace);
    },
  };
})();
