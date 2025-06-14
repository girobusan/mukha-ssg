import { translit } from "./util";
import { makePageLikeObj } from "./util";

function makeSubst(str, dict) {
  let rexps = Object.entries(dict).map(([k, v]) => {
    return [new RegExp(`/[${key}]/gi`), v];
  });
  let r = str;
  rexp.forEach(([rx, rp]) => (r = r.replace(rx, rp)));
  return r;
}

export function slugify(tbl, input_col, slug_col_name) {
  const col_values = Array.from(new Set(tbl.map((r) => r[input_col])));
  if (col_values.length == 0) {
    console.error("No values to slugify in", input_col);
    return tbl;
  }
  const slugs = [];
  col_values.forEach((cv) => {
    let slug_base = translit(cv) || "empty_";
    let preslug = slug_base;
    let num = 1;
    while (slugs.indexOf(preslug) == -1) {
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

export function generateFromRows(tbl, { title, meta, content, path }) {
  let pages = [];
  tbl.forEach((r) => {
    let p_title = makeSubst(title, r);
    let p_meta = Object.assign({}, meta);
    Object.keys(p_meta).forEach((k) => (p_meta[k] = makeSubst(p_meta[k], r)));
    p_meta.title = p_title;

    const page = makePageLikeObj(
      p_meta,
      makeSubst(content, r),
      makeSubst(path, r),
    );
    page.local_data = r;
    pages.push(page);
  });
  return pages;
}

export function generateFromCol(tbl, col_name, { title, meta, content, path }) {
  let pages = [];
  let values = Array.from(new Set(tbl.map((r) => r[col_name])));
  values.forEach((v) => {
    let data = tbl.filter((f) => r[col_name] === value);
    let repDict = { value: v };

    let p_title = makeSubst(title, repDict);
    let p_meta = Object.assign({}, meta);
    Object.keys(p_meta).forEach(
      (k) => (p_meta[k] = makeSubst(p_meta[k], repDict)),
    );
    p_meta.title = p_title;

    const page = makePageLikeObj(
      p_meta,
      makeSubst(content, repDict),
      makeSubst(path, repDict),
    );
    page.local_data = data;
    pages.push(page);
  });
  return pages;
}
