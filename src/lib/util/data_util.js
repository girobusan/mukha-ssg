export function lowercaseKeys(obj) {
  let r = {};
  for (const [k, v] of Object.entries(obj)) {
    r[k.toLowerCase()] = v;
  }
  return r;
}

// will deprecate///
export function writeObjByKeys(obj, keysArray, name, value) {
  if (!name && keysArray.length == 0) {
    throw "Can not write to object";
  }
  if (!name && keysArray.length > 1) {
    name = keysArray.pop();
  }
  if (!keysArray || keysArray.length == 0) {
    obj[name] = value;
    return obj;
  }
  let cursor = keysArray.reduce((a, e) => {
    if (!a[e]) {
      a[e] = {};
    }
    return a[e];
  }, obj);
  cursor[name] = value;
  return obj;
}

/**
 * Retrieves a nested property value from an object using a string path.
 *
 * Supports both object keys and array indices in the path.
 * For example:
 *   - "user.profile.name" → accesses obj.user.profile.name
 *   - "users.0.name"      → accesses obj.users[0].name
 *
 * @template T - The type of the input object.
 * @param {string} str - The path string, where segments are separated by `sep`.
 * @param {T} obj - The object to query.
 * @param {string} [sep="."] - The separator used in the path string (defaults to ".").
 * @returns {unknown | undefined} The value at the specified path, or `undefined` if the path does not exist.
 *
 * @example
 * const data = { users: [{ name: "Alice" }, { name: "Bob" }] };
 * retrieveByStr("users.0.name", data); // "Alice"
 * retrieveByStr("users.1.name", data); // "Bob"
 * retrieveByStr("users.2.name", data); // undefined
 */
export function retrieveByStr(str, obj, sep = ".") {
  const steps = str.split(sep).filter(Boolean);
  return steps.reduce((a, e) => {
    if (a === null || a === undefined) return undefined;

    // for the number!
    const key = /^\d+$/.test(e) ? Number(e) : e;
    return a[key];
  }, obj);
}

export function isTable(dset) {
  if (!Array.isArray(dset)) return false;
  let ref = dset[0];
  let keylen = Object.keys(ref).length;
  let result = true;
  for (let i = 1; i < dset.length; i++) {
    let tkeys = Object.keys(dset[i]);
    if (tkeys.length !== keylen) {
      result = false;
      break;
    }
    tkeys.forEach((tk) => {
      if (!ref.hasOwnProperty(tk)) {
        result = false;
      }
    });
  } //enfor
  return result;
}

export function compactTable(tbl) {
  if (!isTable(tbl)) return tbl;
  const cols = Object.keys(tbl[0]);
  const rows = [];
  tbl.forEach((row) => rows.push(cols.map((c) => row[c])));
  return { cols, rows };
}

export function uncompactTable(tobj) {
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
