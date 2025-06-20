const nodepath = require("path");
const path = nodepath.posix;
const indexRx = /index_?\d*\.html$/i;
// list operations
//
//
export function makeLister(LIST) {
  let tags; // = lst.filter((f) => f.tag);
  const byPath = {};
  const byMeta = {};
  const allByMeta = {};
  return {
    replace: (l) => makeLister(l),
    append: (list2add) => makeLister(LIST.concat(list2add)),
    // add: (i) => makeLister(LIST.concat([i])),
    forEach: (f) => LIST.forEach(f),
    // map: (f) => makeLister(LIST.map(f)), — map must unwrap
    unwrap: () => LIST,
    length: LIST.length,
    sort: (f) => makeLister(LIST.slice().sort(f)),
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

    getAllByMeta: (name, val) => {
      // console.log(`"${name}":"${val}"`);
      if (allByMeta[name] && allByMeta[name][val]) {
        return allByMeta[name][val];
      }
      if (!allByMeta[name]) {
        allByMeta[name] = {};
      }
      let r = LIST.filter((f) => f.meta[name] && f.meta[name].trim() == val);
      allByMeta[name][val] = r.length === 0 ? null : r;
      return allByMeta[name][val];
    },
    getNearFiles: (pth) => {
      let base = path.dirname(pth);
      return LIST.filter((e) => !e.file.path.endsWith("index.html")).filter(
        (e) => path.dirname(e.file.path) === base,
      );
    },
    getNearDirs: (p) => {
      let base = path.dirname(p);
      return LIST.filter((e) => e.file.path.endsWith("index.html")).filter(
        (e) =>
          path.dirname(e.file.path) != base &&
          path.dirname(path.dirname(e.file.path)) === base,
      );
    },
    getAllFiles: (p) => {
      let base = p ? path.dirname(p) : "/";
      return LIST.filter(
        (e) => e.file.path.startsWith(base) && !e.tag && !e.virtual && !e.index,
      );
    },
    getBreadcrumbs: (p, skip_first) => {
      let skip = skip_first || 0;
      let startPath = p.index ? path.dirname(p.file.path) : p.file.path;

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
        let f = LIST.filter((e) => e.file.path == cp);
        if (f.length > 0) {
          bc.push(f[0]);
        }
      }
      // console.log(bc.map((e) => e.file.path).join("|"));
      // console.log("length", bc.length, "skip", skip);
      return skip ? bc.slice(skip) : bc;
    },
  };
}
