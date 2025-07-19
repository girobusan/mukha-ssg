const stemmer = require("lunr-languages/lunr.stemmer.support");
const multi = require("lunr-languages/lunr.multi");
import { langs as langDict } from "./multilang";
import { saveData4JS, saveLib } from "../js_api";
import { getLogger } from "../logging";
var log = getLogger("search");
const incl = {
  ru: require("./incl/lunr.ru.min.js?raw"),
  zh: require("./incl/lunr.zh.min.js?raw"),
};

export function indexAll(lst, keepExcerpts, langs_in) {
  let langs = langs_in ? langs_in.map((e) => e.trim().toLowerCase()) : [];

  const lunr = require("lunr");
  // if no languages or it's only en, do nothing
  // if one language , and not en = stemmer and language
  // if more than one lamguage — stemmer, languages, multi
  let nolangs = false;
  if (
    langs === undefined ||
    !langs ||
    langs.length === 0 ||
    (langs.length === 1 && langs[0] === "en")
  ) {
    nolangs = true;
  } else if (!nolangs && langs.length === 1) {
    stemmer(lunr);
    langDict[langs[0]](lunr);
  } else if (!nolangs && langs.length > 1) {
    stemmer(lunr);
    multi(lunr);
    langs.forEach((l) => {
      if (l === "en") return;
      if (incl[l]) {
        log.debug("Adding known language file:", l);
        saveLib("lunr/lang/lunr." + l + ".js", incl[l]);
      } else {
        log.info(
          "Language file must be installed manually to /_js/lib/lunr/lang/:",
          l,
        );
      }
      langDict[l] ? langDict[l](lunr) : console.warn("Unknown language", l);
    });
  }
  var path2title = [];
  var Idx = lunr(function() {
    if (langs && langs.length > 1) this.use(lunr.multiLanguage(...langs));
    if (!nolangs && langs && langs.length === 1) this.use(lunr[langs[0]]);
    this.field("title", { boost: 6 });
    this.field("excerpt", { boost: 3 });
    this.field("content");
    this.field("id");
    this.ref("id");
    //
    const L = this;
    lst.forEach(function(page) {
      if (page.virtual) return;
      let refobj = { path: page.file.path, title: page.meta.title };
      if (keepExcerpts) {
        refobj.excerpt = page.meta.excerpt;
      }
      path2title.push(refobj);

      L.add({
        title: page.meta.title,
        id: page.file.path,
        content: page.html || page.content || "",
        excerpt: page.meta.excerpt || "",
      });
    }); // adding this here doesn't work (why?)
  });

  //
  // Idx;
  saveData4JS("search.index", Idx);
  saveData4JS("search.titles", path2title);
  // setup
  let setup = {};
  if (!nolangs) {
    setup.langs = langs; //.filter((l) => l !== "en");
    setup.stemmer = true;
    if (langs.length > 1) {
      setup.multi = true;
    }
  }
  saveData4JS("search.setup", setup);
}
