import { translit } from "./util";
import { makePageLikeObj } from "./util";

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
    let repDict = { value: v };

    let p_meta = substValues(meta, repDict);

    const page = makePageLikeObj(
      p_meta,
      makeSubst(content, repDict),
      makeSubst(path, repDict),
      html || "",
    );
    // console.log("---data---");
    // console.log(data);
    // console.log("---end---");
    page.local_data = data;

    // page.list = data;
    page.debug = JSON.stringify(data, null, 2);
    // console.log(page);
    pages.push(page);
  });
  return pages;
}
