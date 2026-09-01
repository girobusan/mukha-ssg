export function lowercaseKeys(obj) {
  let r = {};
  for (const [k, v] of Object.entries(obj)) {
    r[k.toLowerCase()] = v;
  }
  return r;
}

// will deprecate///
/**
 * Writes a value to a nested object using an array of keys.
 * If the key path doesn't exist, intermediate objects are created.
 *
 * @param {Object} obj - The target object to write to.
 * @param {string[]} keysArray - An array of keys representing the path to the parent object.
 * @param {string} [name] - The final key to set the value on. If omitted, the last key from keysArray is used.
 * @param {*} value - The value to assign.
 * @returns {Object} The original object with the new value assigned.
 * @throws {string} Throws an error if both name and keysArray are empty.
 *
 * @example
 * const obj = {};
 * writeObjByKeys(obj, ['user', 'profile'], 'age', 25);
 * // obj becomes { user: { profile: { age: 25 } } }
 *
 * @example
 * const obj = {};
 * writeObjByKeys(obj, ['user', 'profile', 'age'], null, 25);
 * // obj becomes { user: { profile: { age: 25 } } }
 */
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
  // let cursor =
  keysArray.reduce((a, e) => {
    if (!a[e]) {
      a[e] = {};
    }
    return a[e];
  }, obj)[name] = value;
  // cursor[name] = value;
  return obj;
}
/**
 * Writes a value to a nested object using a dot-separated string path.
 * This is a convenience wrapper around writeObjByKeys.
 *
 * @param {string} key - The final key to set the value on.
 * @param {*} val - The value to assign.
 * @param {string} str - The dot-separated path string (e.g., "user.profile.age").
 * @param {Object} obj - The target object to write to.
 * @param {string} [sep="."] - The separator used in the path string.
 * @returns {Object} The original object with the new value assigned.
 *
 * @example
 * const obj = {};
 * writeByString('age', 25, 'user.profile.age', obj);
 * // obj becomes { user: { profile: { age: 25 } } }
 *
 * @example
 * const obj = {};
 * writeByString('name', 'John', 'user/profile/name', obj, '/');
 * // obj becomes { user: { profile: { name: 'John' } } }
 */
export function writeByString(key, val, str, obj, sep = ".") {
  const keys_array = str.split(sep).filter(Boolean);
  return writeObjByKeys(obj, keys_array, key, val);
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
