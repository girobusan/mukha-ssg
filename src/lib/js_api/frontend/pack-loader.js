import { attachResource } from "./attach-resource";
import { wlog } from "./wlog.js";
const registry = new Map();

export function loadPackedObject(
  id,
  url,
  resolveCb,
  rejectCb = console.error,
  myLocation,
) {
  if (!url) {
    url = id;
  }
  wlog.debug("Loading pack:", id, "from", url);
  if (!registry.has(id)) {
    registry.set(id, { url: url, cb: [resolveCb], loaded: false, obj: null });
    //attach script
    attachResource(url, "script", myLocation).catch((e) => rejectCb(e)); // + myLocation...
    // return;
  } else {
    let entry = registry.get(id);
    entry.loaded ? resolveCb(entry.obj) : entry.cb.push(resolveCb);
  }
}

export function loadPackedPromise(id, url) {
  return new Promise((res, rej) => {
    loadPackedObject(id, url, res, rej);
  });
}

// Packed Object CallBack
export function _pocb(id, obj) {
  if (!registry.has(id)) {
    console.warn("Unregistered:", id);
    return;
  }
  let entry = registry.get(id);
  if (!entry.loaded) {
    entry.obj = obj;
    entry.loaded = true;
    wlog.debug("Pack recieved:", id);
  }
  entry.cb.forEach((cb) => cb(obj));
  for (let i = 0; i < entry.cb.length; i++) {
    entry.cb[i](obj);
    delete entry.cb[i];
  }
}

export function createLoader(LOC) {
  return (i, u, rs, rj) => loadPackedObject(i, u, rs, rj, LOC);
}

export function createPromisingLoader(LOC, timeout = 5000) {
  return (i, u) =>
    new Promise((resolve, reject) => {
      let done = false;
      const finish = (fn, val) => {
        if (done) return;
        done = true;
        clearTimeout(TO);
        fn(val);
      };

      const TO = setTimeout(
        () => finish(reject, "Timeout exceed: " + i),
        timeout,
      );
      const resCb = (r) => finish(resolve, r);
      const errCb = (e) => finish(reject, e);

      try {
        loadPackedObject(i, u, resCb, errCb, LOC);
      } catch (e) {
        finish(reject, e);
      }
    });
}
