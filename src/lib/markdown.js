const hljs = require("highlight.js/lib/common");
import { full as emoji } from "markdown-it-emoji";

console.log("Markdown!!1");
export const md = require("markdown-it")({
  html: true,
  langPrefix: "language-",
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch (__) {}
    }
    return ""; // use external default escaping
  },
})
  .use(emoji)
  .use(require("markdown-it-checkbox"))
  .use(require("markdown-it-small"))
  .use(require("markdown-it-footnote"))
  .use(require("markdown-it-attrs"))
  // TODO: better fix!
  .use(require("../markdown-it-multimd-table-ext.js"), {
    headerless: true,
    multiline: true,
  });
//
