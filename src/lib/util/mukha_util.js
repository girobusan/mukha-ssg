export function makePageLikeObj(meta, content, path, html, prehtml) {
  return {
    meta: meta,
    content: content,
    permalink: path,
    html: html || "",
    // prehtml: prehtml || "",
    file: {
      getContent: () => content,
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
