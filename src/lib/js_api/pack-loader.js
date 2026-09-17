const registry = new Map();

export function loadPackedObject(id, url, resolveCb, rejectCb) {
  if (!url) {
    url = id;
  }
  if (!registry.has(id)) {
    registry.set(id, { url: url, cb: [resolveCb], loaded: false, obj: null });
    //attach script
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

export function _pocb(id, obj) {
  if (!registry.has(id)) {
    console.warn("Unregistered:", id);
    return;
  }
  let entry = registry.get(id);
  if (!entry.loaded) {
    entry.obj = obj;
    entry.loaded = true;
  }
  entry.cb.forEach((cb) => cb(obj));
  for (let i = 0; i < entry.cb.length; i++) {
    entry.cb[i](obj);
    delete entry.cb[i];
  }
}
