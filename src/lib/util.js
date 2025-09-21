const unidecode = require("unidecode");
const path = require("path");

var sha256 = require("js-sha256").sha256;
var md5 = require("js-md5");
// const Base62Str = require("./base62.js").default;
import { Base62Str } from "./base62.js";
const base62 = Base62Str.createInstance();

// const bytes = [24, 122, 200, 0];
//
// console.log("Big endian:", bytesToUint32(bytes));           // 413944704
// console.log("Little endian:", bytesToUint32(bytes, true));  // 13165432

function isLittleEndianHost() {
  const buffer = new ArrayBuffer(4);
  new Uint32Array(buffer)[0] = 0x01020304;
  return new Uint8Array(buffer)[0] === 0x04;
}

function bytesToUint32(bytes, littleEndian = false) {
  if (bytes.length !== 4) {
    throw new Error("4 bytes required");
  }

  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);

  bytes.forEach((b, i) => {
    new Uint8Array(buffer)[i] = b;
  });

  return view.getUint32(0, littleEndian);
}

export const simpleMemo = (f) => {
  let memo = {};
  return (a) => {
    if (!memo.hasOwnProperty(a)) memo[a] = f(a);
    return memo[a];
  };
};

const makeHashFn = (HF) => (t) =>
  String.fromCharCode.apply(null, base62.encode(HF(t)));

export const shortHash = simpleMemo(makeHashFn(md5.digest));
export const longHash = simpleMemo(makeHashFn(sha256.digest));

export function translit(t, short) {
  let r = unidecode(t.trim())
    .toLowerCase()
    .replace(/\s/g, "_")
    .replace(/[^a-zA-Z0-9-_]/g, "");
  if (short || short === undefined) {
    if (r.length > 100) {
      return r.substring(0, 99);
    }
  }
  return r === "index" ? "index_" : r;
}

export function addNumber(url, number) {
  const r = url.replace(/\.([^.]+)$/, `_${number}.$1`);
  return r;
}

export function lowercaseKeys(obj) {
  let r = {};
  for (const [k, v] of Object.entries(obj)) {
    r[k.toLowerCase()] = v;
  }
  return r;
}

export function makePageLikeObj(meta, markdown, path, html) {
  return {
    meta: meta,
    content: markdown,
    permalink: path,
    html: html || "",
    file: {
      getContent: () => markdown,
      path: path,
    },
  };
}

export function cloneFile(f) {
  let clone = Object.assign({}, f);
  clone.meta = Object.assign({}, f.meta);
  clone.file = Object.assign({}, f.file);
  return clone;
}

export function rangeArray(start, length) {
  let r = [];
  for (let i = 0; i < length; i++) {
    r.push(i + start);
  }
  return r;
}

export function niceDate(date) {
  return (
    date.getFullYear() +
    "." +
    (date.getMonth() + 1 + 100).toString().substring(1) +
    "." +
    date.getDate() +
    " " +
    date.getHours() +
    ":" +
    (100 + date.getMinutes()).toString().substring(1)
  );
}

export function fitToWidth(text, width) {
  width = width || 80;
  const words = text.split(" ");
  const lines = [];
  let cline = "";
  words.forEach((w) => {
    let draft = cline ? cline + " " + w : w;
    if (draft.length > width) {
      lines.push(cline);
      cline = w;
      return;
    }
    cline = draft;
  });

  lines.push(cline);

  return lines.join(" \n");
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

export function median(numbers) {
  const sorted = Array.from(numbers).sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

export function formatLastModified(date) {
  if (!(date instanceof Date)) {
    throw new TypeError("Аргумент должен быть объектом Date");
  }

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const day = weekdays[date.getUTCDay()];
  const dateNum = date.getUTCDate().toString().padStart(2, "0");
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  const seconds = date.getUTCSeconds().toString().padStart(2, "0");

  return `${day}, ${dateNum} ${month} ${year} ${hours}:${minutes}:${seconds} GMT`;
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

export function stringify2JSON(obj) {
  const seen = new WeakSet();
  return JSON.stringify(obj, (_, value) => {
    if (value !== null && typeof value === "object") {
      if (seen.has(value)) return;
      seen.add(value);
    }
    return value;
  });
}

/*
 *  returns absolute path
 */
export function absPath(p) {
  return path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
}

export function stripHTML(str) {
  if (!str || str.length <= 2) return str;
  let txt = str;

  const rexp = [
    [/<script[^>]*\>.*?<\/script>/gi, " "],
    [/<style[^>]*\>.*?<\/style>/gi, " "],
    [/<noscript[^>]*\>.*?<\/noscript>/gi, " "],
    [/<\/?(p|br|hr|ul|ol|li|div)[^>]*>/gi, " "],
    [/<[^>]*>/gi, ""],
    [/^\s*\n+/gm, ""],
    [/^\s+/gm, ""],
  ];

  rexp.forEach((r) => (txt = txt.replace(r[0], r[1])));
  // console.log(str);
  // console.log("-↓result↓-");
  // console.log(txt);
  // console.log("====");
  return txt.trim();
}
