import { translit } from "./util";
import { makePageLikeObj } from "./util";
import { numSort, strSort } from "./list";

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
  if (typeof str !== "string") {
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
export function sort(tbl, col, as_number, desc) {
  if (as_number) {
    return numSort(tbl, (r) => r[col], desc);
  }
  return strSort(tbl, (r) => r[col], desc);
}
export function slugify(tbl, input_col, slug_col_name) {
  const col_values = Array.from(new Set(tbl.map((r) => r[input_col])));
  // console.log("Get values", col_values.length);
  if (col_values.length == 0) {
    console.error("No values to slugify in", input_col);
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
  in_tbl.forEach((r) => (r[out_col] = val_dict[r[col]]));
  return in_tbl;
}

export function generateFromRows(tbl, { meta, content, path, html }) {
  let pages = [];
  tbl.forEach((r) => {
    let p_meta = substValues(meta, r);

    // Object.keys(p_meta).forEach((k) => (p_meta[k] = makeSubst(p_meta[k], r)));

    const page = makePageLikeObj(
      p_meta,
      makeSubst(content, r),
      makeSubst(path, r),
      html || "",
    );
    page.local_data = r;
    pages.push(page);
  });
  return pages;
}

export function generateFromCol(tbl, col_name, { meta, content, path, html }) {
  let pages = [];
  let values = Array.from(new Set(tbl.map((r) => r[col_name])));
  values.forEach((v) => {
    let data = tbl.filter((r) => r[col_name] === v);
    let repDict = data.length > 0 ? data[0] : { value: v };

    let page_meta = substValues(meta, repDict);

    const page = makePageLikeObj(
      page_meta,
      content ? makeSubst(content, repDict) : "",
      makeSubst(path, repDict),
      html ? makeSubst(html, repDict) : "",
    );
    // console.log(data);
    page.local_data = data;

    // page.list = data;
    page.debug = JSON.stringify(data, null, 2);
    // console.log(page);
    pages.push(page);
  });
  return pages;
}
