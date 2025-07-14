// async load of clobal datasets
// ns global (from data module)
// ns system (system data; search)
// async load of local datasets
import { posix } from "path-browserify";

(function() {
  if (window.Mukha) {
    return;
  } // dont

  const myLocation = document.currentScript.dataset.location;
  console.info("Mukha JS API client", VERSION, "at", myLocation);
  //
  function relative(from, to) {
    return posix.relative(posix.dirname(from), to);
  }

  function retrieveByStr(str, obj, sep) {
    const separator = sep || ".";
    let steps = str.split(separator).filter((e) => e);
    return steps.reduce((a, e) => (a ? a[e] : undefined), obj);
  }
  function addByStr(str, obj, value) {
    const steps = str.split(".");
    let where = steps.reduce((a, e, i) => {
      if (!a[e]) {
        i + 1 === steps.length ? (a[e] = value) : (a[e] = {});
      }
      a = a[e];
      return a;
    }, obj);
    return obj;
  }
  var Data = {};
  var requests = {};
  window.Mukha = {
    registerData: (key, dt) => {
      if (requests[key]) {
        requests[key](dt);
        delete requests[key];
        return;
      }
      console.warn("Unrequested dataset:", key);
      addByStr(key, Data, dt);
    },
    relpath: (f, t) => relative(f, t),
    permalink: myLocation,
    getData: function(nsname, type) {
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
          addByStr(data_key, Data, d);
          res(d);
        };
      });
    },
  };
})();
