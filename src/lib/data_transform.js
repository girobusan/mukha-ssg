import { translit, shortHash, longHash } from "./util";
import { makePageLikeObj } from "./util";
import { numSort, strSort } from "./list";
import { getLogger } from "./logging";
var log = getLogger("data-transform");

function median(numbers) {
  const sorted = Array.from(numbers).sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}
function groupBy(arr, key) {
  let vals = Array.from(new Set(arr.map((e) => e[key])));
  let groups = {};
  vals.forEach((v) => (groups[v] = arr.filter((r) => r[key] == v)));
  return groups;
}

function makeSubst(str, dict) {
  if (typeof str !== "string" || !str) {
    return str;
  }
  let rexps = Object.entries(dict).map(([k, v]) => {
    return [new RegExp(`\\[${k}]`, "gi"), v];
  });
  let r = str;

  rexps.forEach(([rx, rp]) => (r = r.replace(rx, rp)));
  return r;
}

function substValues(obj, substDict) {
  Object.keys(obj).forEach((k) => (obj[k] = makeSubst(obj[k], substDict)));
  return obj;
}

function idfyArray(arr) {
  const uniq = Array.from(new Set(arr));
  const ids = uniq.map((v, i) => i + 1); // start from 1
  const pairs = ids.map((v, i) => [uniq[i], v]);
  const inv_pairs = ids.map((v, i) => [v, uniq[i]]);

  const encode_dict = Object.fromEntries(pairs);

  const output = arr.map((e) => encode_dict[e]);
  return [output, Object.fromEntries(inv_pairs)];
}

function slugifyArray(arr) {
  const col_values = Array.from(new Set(arr));
  const slugSet = new Set();
  const slugs = col_values.map((cv) => {
    let slug_base = translit(cv.toString()) || "empty_";
    let preslug = slug_base;
    let num = 1;
    while (slugSet.has(preslug)) {
      preslug = slug_base + num;
      num += 1;
    }
    slugSet.add(preslug);
    return preslug;
  });

  return col_values.reduce((a, e, i) => {
    a[e] = slugs[i];
    return a;
  }, {});
}

//
// EXPORTS
//
export function delCols(tbl, cols) {
  tbl.forEach((row) => {
    cols.forEach((col) => {
      if (row[col] !== undefined) {
        delete row[col];
      }
    });
  });
  return tbl;
}
export function number(tbl, cols, loc) {
  let myloc = loc || "en";
  let nf = new Intl.NumberFormat(myloc);
  let locinfo = nf.formatToParts(5000000.05);
  let replaces = [];
  locinfo.currency &&
    replaces.push([new RegExp(`${locinfo.currency}`, "g"), ""]);
  locinfo.group && replaces.push([new RegExp(`${locinfo.group}`, "g"), ""]);
  locinfo.decimal &&
    replaces.push([new RegExp(`${locinfo.decimal}`, "g"), "."]);

  const toN = (s) => {
    let r = s;
    replaces.forEach((rx) => r.replace(rx[0], rx[1]));
    return Number(r);
  };

  tbl.forEach((row) => {
    cols.forEach((col) => {
      if (row[col] !== undefined) {
        row[col] = toN(row[col]);
      }
    });
  });
}
export function sort(tbl, col, as_number, desc) {
  if (as_number) {
    return numSort(tbl, (r) => r[col], desc);
  }
  return strSort(tbl, (r) => r[col], desc);
}

export function shorten(tbl, input_col, short_col_name, short, long) {
  let HF = long ? longHash : shortHash;
  tbl.forEach((row) => (row[short_col_name] = HF(row[input_col].toString())));
  return tbl;
}

export function idfy(tbl, input_col, output_col, dictHandler) {
  const [ids, dict] = idfyArray(tbl.map((e) => e[input_col]));
  tbl.forEach((row, i) => {
    row[output_col] = ids[i];
  });
  if (typeof dictHandler === "function") dictHandler(dict);
  return tbl;
}

export function combine(tbl, input_cols, output_col, short, long) {
  let HF = long ? longHash : shortHash;

  tbl.forEach((row) => {
    let combined = input_cols.reduce((a, e) => (a += row[e].toString()), "");
    row[output_col] = HF(combined);
  });
  return tbl;
}
export function slugify(tbl, input_col, slug_col_name) {
  const col_values = Array.from(new Set(tbl.map((r) => r[input_col])));
  // console.log("Get values", col_values.length);
  if (col_values.length == 0) {
    log.warn("No values to slugify in", input_col);
    return tbl;
  }
  const slugs = [];
  col_values.forEach((cv) => {
    let slug_base = translit(cv) || "empty_";
    let preslug = slug_base;
    let num = 1;
    while (slugs.indexOf(preslug) != -1) {
      preslug = slug_base + num;
      num += 1;
    }
    slugs.push(preslug);
  });
  const slugdict = col_values.reduce((a, e, i) => {
    a[e] = slugs[i];
    return a;
  }, {});
  tbl.forEach((r) => (r[slug_col_name] = slugdict[r[input_col]]));
  return tbl;
}

export function aggregate(in_tbl, aggregateType, group_by, col, out_col) {
  function aggregateArray(aggType, tbl) {
    let val;
    switch (aggType) {
      case "count_u":
        val = new Set(tbl.map((r) => r[col])).size;
        break;
      case "sum":
        val = tbl
          .map((r) => r[col])
          .map((v) => +v)
          .filter((v) => !Number.isNaN(v))
          .reduce((a, e) => a + e, 0);
        break;
      case "avg":
        let nums = tbl
          .map((r) => r[col])
          .map((v) => +v)
          .filter((v) => !Number.isNaN(v));
        let summ = nums.reduce((a, e) => a + e, 0);
        val = nums.legth > 0 ? summ / nums.length : null;

        break;
      case "median":
        let vals = tbl
          .map((r) => r[col])
          .map((v) => +v)
          .filter((v) => !Number.isNaN(v));
        val = vals.length > 0 ? median(vals) : 0;
        break;

      default:
        val = tbl.length; // count *
    }
    return val;
  }
  if (!group_by) {
    let val = aggregateArray(aggregateType, in_tbl);
    in_tbl.forEach((r) => (r[out_col] = val));
    return in_tbl;
  }
  let val_dict = groupBy(in_tbl, group_by);
  for (const key in val_dict) {
    val_dict[key] = aggregateArray(aggregateType, val_dict[key]);
  }
  // console.log("valdict", val_dict);
  in_tbl.forEach((r) => {
    // console.log(r, r[group_by], val_dict[r[col]]);
    r[out_col] = val_dict[r[group_by]];
  });
  return in_tbl;
}

//
//    GENERATION
//
//
function prepPage({ meta, content, path, html }, repDict, data) {
  let page_meta = substValues(Object.assign({}, meta), repDict);
  if (html) page_meta.html = true;
  // auto excerpt is almost always bad here
  if (!meta.excerpt) meta.excerpt = "<!--no excerpt-->";
  let pageContent = content || html;

  const page = makePageLikeObj(
    page_meta,
    makeSubst(pageContent, repDict),
    makeSubst(path, repDict),
    null, // html ? makeSubst(html, repDict) : "",
    // html ? makeSubst(html, repDict) : "", // prehtml
  );
  page.local_data = data;
  // page.debug = JSON.stringify(data, null, 2); // FIX: remove
  return page;
}

export function generateFromRows(tbl, { meta, content, path, html }) {
  let pages = [];
  tbl.forEach((r) => {
    pages.push(prepPage({ meta, content, path, html }, r, r));
  });
  return pages;
}

export function generateFromCol(tbl, col_name, { meta, content, path, html }) {
  let pages = [];
  let values = Array.from(new Set(tbl.map((r) => r[col_name])));
  values.forEach((v) => {
    let data = tbl.filter((r) => r[col_name] === v);
    pages.push(prepPage({ meta, content, path, html }, data[0], data));
  });
  return pages;
}

export function generateForEachKey(obj, { meta, content, path, html }) {
  let keys = Object.keys(obj);
  if (keys.length === 0) return;
  let pages = [];
  keys.forEach((k) => {
    pages.push(prepPage({ meta, content, path, html }, { key: k }, obj[k]));
  });
  return pages;
}
