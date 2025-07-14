import { Builder } from "lunr";
import { saveData4JS } from "../js_api";

var Idx = null;
var path2title = [];

export function indexAll(lst, keepExcerpts) {
  let Bldr = new Builder();
  Bldr.field("title", { boost: 6 });
  Bldr.field("excerpt", { boost: 3 });
  Bldr.field("content");
  Bldr.field("id");
  Bldr.ref("id");
  //
  lst.forEach((page) => {
    if (page.virtual) return;
    let refobj = { path: page.file.path, title: page.meta.title };
    if (keepExcerpts) {
      refobj.excerpt = page.meta.excerpt;
    }
    path2title.push(refobj);

    Bldr.add({
      title: page.meta.title,
      id: page.file.path,
      content: page.html || page.content || "",
      excerpt: page.meta.excerpt || "",
    });
  });
  Idx = Bldr.build();
  saveData4JS("search.index", Idx);
  saveData4JS("search.titles", path2title);
}
