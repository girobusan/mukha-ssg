const nunjucks = require("nunjucks");
import { tableFilter } from "./template_additions";
import { addNumber, cloneFile, niceDate, rangeArray } from "./util";
import postprocess from "./postprocess";

function makeObjectLoader(obj) {
  //
  //fix:
  //if there is one file
  //it's automatically root
  //
  const tpnames = Object.keys(obj);
  if (tpnames.length == 1 && tpnames[0] != "index.njk") {
    obj = { "index.njk": obj[tpnames[0]] };
  }
  return {
    getSource: (n) => {
      return { src: obj[n], path: n, noCache: false };
    },
  };
}

export function renderAndSave(fullLister, config, templates, writeFn, data) {
  // Environment
  const tpl = new nunjucks.Environment([makeObjectLoader(templates)], {
    autoescape: false,
    trimBlocks: true,
    lstripBlocks: true,
  });
  tpl.addFilter("to_table", tableFilter);
  tpl.addFilter("shorten", function(str, count) {
    return str.slice(0, count || 5);
  });
  // console.log(tpl.filters);

  let virtuals = [];
  const commonContext = { list: fullLister, config: config }; // +
  //
  // creates fn
  // which makes multipage list
  // for file
  function makeMP(f) {
    return function(lst, length) {
      // console.log("Make pagination!");
      let onPage = length || config.list_length || 20;
      if (lst.length <= onPage) {
        f.page_count = 1;
        f.page_links = [];
        f.page = 1;
        f.list_page = lst;
        return;
      }
      let pages = rangeArray(1, Math.ceil(lst.length / onPage));
      // console.log("Pages:", pages.length);
      let urls = pages.map((n, i) => {
        return i == 0 ? f.file.path : addNumber(f.file.path, n);
      });
      //
      f.page_count = pages.length;
      f.page_links = urls;
      f.page_number = 1;
      f.list_page = lst.slice(0, onPage);
      pages.forEach((n, i) => {
        if (i == 0) {
          //skip first
          return;
        } //skip 1st page
        let clone = cloneFile(f);
        clone.page = n;
        clone.file = { path: urls[i] };
        clone.virtual = true;
        let sliced = lst.slice(i * onPage, (i + 1) * onPage);
        clone.list_page = sliced;

        // console.log("CLONE", clone.list_page);
        virtuals.push(clone);
      });
    };
  }

  function renderList(list, writeFn, pass) {
    list.forEach((page) => {
      // console.log(f.meta);
      let localContext = {
        makePagination: pass === 1 ? makeMP(page) : () => false,
        data: data,
        meta: page.meta,
        path: page.file.path,
        html: page.html,
        file: page, // deprecated
        page: page, // — must be page
        util: {
          niceDate: niceDate,
          makeTable: tableFilter,
          debug: (o) => JSON.stringify(o, null, 2),
        },
      };
      let html = tpl.render(
        "index.njk",
        Object.assign(commonContext, localContext),
      );
      html = nunjucks.renderString(html, localContext);
      html = postprocess(html, page.file.path, fullLister);
      writeFn(page.file.path, html);
    });
  }
  //passes
  renderList(fullLister, writeFn, 1);
  renderList(virtuals, writeFn, 2);
}
