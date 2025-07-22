// async load of clobal datasets
// ns global (from data module)
// ns system (system data; search)
// async load of local datasets
import { posix } from "path-browserify";

(function () {
  if (window.Mukha) {
    return;
  } // dont

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

  function retrieveByStr(str, obj, sep) {
    const separator = sep || ".";
    let steps = str.split(separator).filter((e) => e);
    return steps.reduce((a, e) => (a ? a[e] : undefined), obj);
  }
  function addByStr(str, obj, value) {
    const steps = str.split(".");
    steps.reduce((a, e, i) => {
      if (!a[e]) {
        i + 1 === steps.length ? (a[e] = value) : (a[e] = {});
      }
      a = a[e];
      return a;
    }, obj);
    return obj;
  }
  var Data = {};
  var localData = {};
  var requests = {};
  var localDataRqsts = {};
  window.Mukha = {
    // :TODO: redo
    registerData: (key, dt, compact) => {
      let dts = compact ? uncompact(dt) : dt;
      if (requests[key]) {
        requests[key](dts);
        delete requests[key];
        return;
      }
      console.warn("Unrequested dataset:", key);
      addByStr(key, Data, dts);
    },
    registerLocalData: (path, name, dt, compact) => {
      let key = path + "/" + name;
      let dts = compact ? uncompact(dt) : dt;
      if (localDataRqsts[key]) {
        localDataRqsts[key](dts);
        delete localDataRqsts[key];
        return;
      }
      console.warn("Unrequested local dataset:", key);
      if (!localData[path]) localData[path] = {};
      localData[path][name] = dts;
    },
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
    getLocalData: function (name, pth) {
      let pt = pth || myLocation;
      if (localData[pt] && localData[pt][name]) {
        return Promise.resolve(localData[pt][name]);
      }
      let dpath = "/_js/data/local" + pt + "/" + name + ".js";

      let data_key = pt + "/" + name;
      return new Promise((res, rej) => {
        let sc = document.createElement("script");
        sc.addEventListener("error", () => rej("no data"));
        document.body.appendChild(sc);
        sc.src = relative(myLocation, dpath);
        localDataRqsts[data_key] = (d) => {
          res(d);
        };
      });
    },
    getData: function (nsname, type) {
      let tp = type;
      if (!tp) tp = "datasets";
      let data_key = tp + "." + nsname;
      let saved = retrieveByStr(data_key, Data);
      if (saved) {
        // console.info("Already loaded.", Data);
        return Promise.resolve(saved);
      }
      let data_path =
        "/_js/data/global/" + tp + "/" + nsname.split(".").join("/") + ".js";
      return new Promise((res, rej) => {
        let sc = document.createElement("script");
        sc.addEventListener("error", () => rej("no data"));
        document.body.appendChild(sc);
        sc.src = relative(myLocation, data_path);
        requests[data_key] = (d) => {
          // addByStr(data_key, Data, d);
          res(d);
        };
      });
    },
  };
})();
