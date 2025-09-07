const nodepath = require("path");
import { getLogger } from "./logging";
var log = getLogger("lister");
const path = nodepath.posix;
export const indexPageRx = /index(_\d*)?\.html$/i;
export const LISTER_TAG = Symbol.for("lister");
/**
 * @typedef Page
 * @type {object}
 * @property {File} file - linked file object
 * @property {array} list - attached list
 * @property {string} html - html
 * @property {string} content - markdown
 * @property {boolean} virtual - is page virtual
 * @property {boolean} index - is page an index
 * @property {object} meta - metadata
 *
 * */

/**
 * @typedef Lister
 * @type {object}
 * @property {function(array):Lister} append - appends list to lister
 * @property {function(function):void} forEach - regular for each
 * @property {number} length - Lister length
 * @property {function(function):Lister} map - regular map
 * @property {function(function):Lister} slice - regular slice
 * @property {function(function):Lister} sort - returns sorted copy of Lister
 *
 * @property {function():Lister} tags - retrurns tag list
 *
 * @property {function(string, boolean , boolean): Lister} sortByMeta - retrurns
 * sorted by given meta copy.
 *
 * @property {function(string): Page} getByPath - retrurns page by site path
 *
 * @property {function(string,any):Page} getByMeta - retrurns page by metadata
 * name/value pair
 *
 * @property {function(string,any):Page} excludeByMeta - excludes page by metadata
 * name/value pair, returns new lister
 *
 * @property {function(string,any):Lister} getAllByMeta - retrurns all pages
 * with given meta value
 *
 * @property {function(string|Page):Lister} getAllFiles - retrurns all pages
 * under the given path
 *
 * @property {function(string|Page):Lister} getAllDirs - retrurns all pages
 * under the given path
 *
 * @property {function(string|Page):Lister} getNearFiles - retrurns all pages
 * near the given path
 *
 * @property {function(string|Page):Lister} getNearDirs - retrurns all dirs (index
 * files) near the given path
 *
 * @property {function(string|Page):Page} getParent - retrurns nearest index
 * up the directory tree
 *
 * @property {function(string|Page, number):array} getBreadcrumbs - retrurns
 * breadcrumbs, directries without index files are skipped. Second parameters
 * defines, how many dirs to skip
 *
 */

export const numSort = (arr, accessor, desc) => {
  return arr.sort((a, b) => {
    const aval = Number.isNaN(+accessor(a)) ? 0 : +accessor(a);
    const bval = Number.isNaN(+accessor(b)) ? 0 : +accessor(b);
    return !desc ? aval - bval : bval - aval;
  });
};

export const strSort = (arr, accessor, desc) => {
  return arr.sort((a, b) => {
    let av = accessor(a).toString();
    let bv = accessor(b).toString();
    if (av == bv) return 0;
    if (av > bv) return desc ? -1 : 1;
    if (av < bv) return desc ? 1 : -1;
  });
};
const dateSort = (arr, _, desc) => {
  return arr.sort((a, b) => {
    let av = 0;
    let bv = 0;
    try {
      av = a.meta.date.getTime();
    } catch (e) { }
    try {
      bv = b.meta.date.getTime();
    } catch (e) { }
    return !desc ? av - bv : bv - av;
  });
};

/** @function ensurePath
 * @returns {string} - path
 * */
const ensurePath = (something) => {
  if (typeof something === "string") return something;
  try {
    return something.file.path;
  } catch (e) {
    return null;
  }
};

/**
 * @param {Lister} lister - Lister to search
 * @returns {Page}
 * */

const ensurePage = (something, lister) => {
  if (typeof something === "string") {
    return lister.getByPath(something);
  }
  return something;
};
// list operations
//
//
/**
 *
 * @param {array} LIST - list of pages
 * @returns {Lister}
 * */
export function makeLister(LIST) {
  let tags; // = lst.filter((f) => f.tag);
  const byMeta = {};
  const allByMeta = {};
  const allWithMeta = {};
  const allFiles = {};
  const byPath = LIST.reduce((a, p) => {
    a[p.file.path] = p;
    return a;
  }, {});
  /**
   * @type Lister
   * */
  const L = {
    [LISTER_TAG]: true,
    [Symbol.iterator]: () => LIST[Symbol.iterator](),
    replace: (l) => makeLister(l),
    append: (list2add) => makeLister(LIST.concat(list2add)),
    forEach: (f) => LIST.forEach(f),
    map: (f) => makeLister(LIST.map(f)),
    unwrap: () => LIST.slice(),
    length: LIST.length,
    sort: (f) => makeLister(LIST.slice().sort(f)),
    slice: (f, t) => LIST.slice(f, t),
    tags: () =>
      tags !== undefined
        ? tags
        : (tags = LIST.filter((f) => f.tag).sort((a, b) => {
          let aval = a.meta.title.toLowerCase();
          let bval = b.meta.title.toLowerCase();
          if (aval === bval) {
            return 0;
          }
          if (aval > bval) {
            return 1;
          }
          if (aval < bval) {
            return -1;
          }
        })),
    getByPath: (p) => {
      if (byPath[p]) {
        return byPath[p];
      }
      let r = LIST.filter((e) => e.file.path === p);
      let r1 = r.length == 0 ? null : r[0];
      byPath[p] = r1;
      return r1;
    },
    /**
     * @param {string} name — meta name
     * @param {boolean} asNumber - sort as numbers
     * @param {boolean} desc - sort descending
     *
     * */
    sortByMeta: (name, asNumber, desc) => {
      let r = LIST.slice();
      let sortfn;
      if (name === "date") {
        sortfn = dateSort;
      } else {
        sortfn = asNumber ? numSort : strSort;
      }
      let def = asNumber ? 0 : "";
      return makeLister(
        sortfn(
          r,
          (e) => (e.meta[name] !== undefined ? e.meta[name] : def),
          desc,
        ),
      );
    },
    getByMeta: (name, val) => {
      // console.log(`"${name}":"${val}"`);
      if (byMeta[name] && byMeta[name][val]) {
        return byMeta[name][val];
      }
      if (!byMeta[name]) {
        byMeta[name] = {};
      }
      let r = LIST.filter((f) => f.meta[name] && f.meta[name].trim() == val);
      byMeta[name][val] = r.length === 0 ? null : r[0];
      return byMeta[name][val];
    },
    excludeByMeta: (name, val) => {
      let r = LIST.filter((f) => f.meta[name] && f.meta[name].trim() != val);
      return makeLister(r);
    },

    getAllByMeta: (name, val) => {
      // console.log(`"${name}":"${val}"`);
      if (allByMeta[name] && allByMeta[name][val]) {
        return allByMeta[name][val];
      }
      if (!allByMeta[name]) {
        allByMeta[name] = {};
      }
      let r = LIST.filter((f) => f.meta[name] && f.meta[name].trim() == val);
      allByMeta[name][val] = r.length === 0 ? null : makeLister(r);
      return allByMeta[name][val];
    },
    getAllWithMeta: (name) => {
      if (allWithMeta[name]) return allWithMeta[name];
      let r = makeLister(LIST.filter((f) => f.meta[name] !== undefined));
      allWithMeta[name] = r;
      return r;
    },
    getNearFiles: (p) => {
      let pth = ensurePath(p);
      let base = path.dirname(pth);
      let r = LIST.filter((e) => !e.index).filter(
        (e) => path.dirname(e.file.path) === base,
      );
      // return r;
      return makeLister(r); // makes error!
    },
    getNearDirs: (p) => {
      let pth = ensurePath(p);
      let base = path.dirname(pth);
      let r = LIST.filter((e) => e.index).filter(
        (e) =>
          path.dirname(e.file.path) != base &&
          path.dirname(path.dirname(e.file.path)) === base,
      );
      // return r;
      return makeLister(r);
    },
    getAllFiles: (p) => {
      let pth = ensurePath(p);
      let cacheKey;
      if (
        !pth ||
        pth.toLowerCase == "/index.html" ||
        path.dirname(pth) == "/" ||
        !path.dirname
      ) {
        cacheKey = "_all";
      } else {
        cacheKey = pth;
      }
      if (allFiles[cacheKey] && cacheKey == "_all")
        if (allFiles[cacheKey]) {
          return allFiles[cacheKey];
        }
      if (cacheKey == "_all") {
        const resAll = LIST.filter((e) => !e.tag && !e.virtual && !e.index);
        log.debug("Add all files to _all cache:", resAll.length);
        allFiles[cacheKey] = makeLister(resAll);
        return allFiles[cacheKey];
      }

      let base = pth ? path.dirname(pth) : "/";
      let r = LIST.filter(
        (e) => e.file.path.startsWith(base) && !e.tag && !e.virtual && !e.index,
      );
      // return r;
      allFiles[cacheKey] = makeLister(r);
      return allFiles[cacheKey];
    },
    getAllDirs: (p) => {
      let pg = ensurePage(p, L);
      let pth = pg.file.path;
      let base = pth ? path.dirname(pth) : "/";
      let baselen = base.length;
      let isindex = pg.index;
      let r = LIST.filter(
        (e) =>
          (isindex
            ? path.dirname(e.file.path).startsWith(base) &&
            path.dirname(e.file.path).length > baselen
            : e.file.path.startsWith(base)) &&
          !e.tag &&
          !e.virtual &&
          e.index,
      );
      // return r;
      return makeLister(r);
    },
    getParent: (p) => {
      let pg = ensurePage(p, L);
      if (!pg) return null;
      let pth = pg.file.path; //ensurePath(p);
      if (pg.index && path.dirname(pth) == "/") return null;
      let maybe = pg.index
        ? path.dirname(path.dirname(pth))
        : path.dirname(pth);
      maybe = path.join(maybe, "index.html");
      while (!L.getByPath(maybe) && maybe != "/index.html") {
        maybe = path.join(path.dirname(path.dirname(maybe)), "index.html");
      }
      return L.getByPath(maybe);
    },
    getBreadcrumbs: (arg, skip_first) => {
      let pg = ensurePage(arg, L);
      if (!pg) return null;
      if (pg.index && path.dirname(pg.file.path) == "/") return [];
      let skip = skip_first || 0;
      let startPath = pg.index ? path.dirname(pg.file.path) : pg.file.path;

      let dirs = path
        .dirname(startPath)
        .split("/")
        .filter((e) => e);
      let bc = [];
      for (let i = 0; i <= dirs.length; i++) {
        let cp = dirs.slice(0, i).join("/") + "/index.html";
        // console.log(cp);
        // :TODO: redo
        if (!cp.startsWith("/")) {
          cp = "/" + cp;
        }
        let f = L.getByPath(cp);
        if (f) {
          bc.push(f);
        }
      }
      // console.log(bc.map((e) => e.file.path).join("|"));
      // console.log("length", bc.length, "skip", skip);
      return skip ? bc.slice(skip) : bc;
    },
  };
  return L;
}
