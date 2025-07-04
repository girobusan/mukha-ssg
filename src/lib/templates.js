const nunjucks = require("nunjucks");
import { format as dateFormat } from "date-fns";
import { tableFilter } from "./template_additions";
import { md2html } from "./md_parser";
import { addNumber, cloneFile, niceDate, rangeArray } from "./util";
import { generate as makePaginationSeq } from "./pagination/pagination";
import postprocess from "./postprocess";

function makeObjectLoader(obj) {
  //
  //fix:
  //if there is one file
  //it's automatically root
  //
  const tpnames = Object.keys(obj);
  // console.log(
  //   "Templates files are:\n" + tpnames.map((t) => " -" + t).join("\n"),
  // );

  if (tpnames.length == 1 && tpnames[0] != "index.njk") {
    obj = { "index.njk": obj[tpnames[0]] };
  }
  return {
    getSource: (n) => {
      if (!obj[n]) {
        throw ("No template:", n);
      }
      let r = { src: obj[n], path: n, noCache: false };
      return r;
    },
  };
}

export function renderAndSave(fullLister, config, templates, writeFn, data) {
  // Environment
  const objLoader = makeObjectLoader(templates);
  const tpl = new nunjucks.Environment([objLoader], {
    autoescape: false,
    trimBlocks: true,
    lstripBlocks: true,
  });
  tpl.addFilter("to_table", tableFilter);
  tpl.addFilter("shorten", function(str, count) {
    return str.slice(0, count || 5);
  });

  let virtuals = [];
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
        f.page_number = 1;
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
      // console.log("paginated:", urls.join(", "));
      pages.forEach((n, i) => {
        if (i == 0) {
          //skip first
          return;
        } //skip 1st page
        let clone = cloneFile(f);
        clone.page_number = n;
        clone.file.path = urls[i];
        clone.virtual = true;
        let sliced = lst.slice(i * onPage, (i + 1) * onPage);
        clone.list_page = sliced;

        // console.log("CLONE", clone);
        virtuals.push(clone);
      });
    };
  }

  function renderList(list, writeFn, pass) {
    // console.log("Render list");
    list.forEach((page) => {
      // if (pass == 2) console.log("pass2 start", page.file.path);
      let safeContext = {
        config: config,
        data: data,
        makePagination: () => safeContext.splitToPages(), // deprecated
        splitToPages: () =>
          console.log(
            "Attempt to call unsafe function in safe context",
            page.file.path,
          ),
        meta: page.meta,
        path: page.file.path,
        file: page, // deprecated
        page: page, // — must be page
        util: {
          niceDate: niceDate,
          dateFormat: (dt, fmt, opts) => dateFormat(dt, fmt, opts),
          makeTable: tableFilter,
          debugObj: (o) => console.log(JSON.stringify(o, null, 2)),
          debug: function() {
            console.log.apply(this, arguments);
          },
          paginate: (edges, center) => {
            if (!page.page_count || page.page_count < 2) return [];
            let sequence = makePaginationSeq(
              page.page_number,
              page.page_count,
              edges || 1,
              center || 1,
              0,
            );
            return sequence.map((n) => {
              return {
                label: n === 0 ? "&hellip;" : n,
                type:
                  n === 0
                    ? "ellipsis"
                    : n === page.page_number
                      ? "current"
                      : "link",
                link: n === 0 ? null : page.page_links[n - 1],
              };
            });
          },
        },
      }; // /safeContext

      // md2html
      if (pass == 1) {
        page.meta.excerpt && (page.meta.excerpt = md2html(page.meta.excerpt));
      }
      // render nunjucks in content
      if (page.html) {
        try {
          page.html = tpl.renderString(page.html, safeContext);
        } catch (e) {
          console.log("Malformed template tags in html at", page.file.path);
        }
      } else {
        if (page.content) {
          try {
            let renderedInMd = tpl.renderString(page.content, safeContext);
            page.html = md2html(renderedInMd);
          } catch (e) {
            console.log(
              "Malformed template tags in markdown at",
              page.file.path,
            );
            page.html = md2html(page.content);
          }
        }
      }
      //
      //

      let adultContext = Object.assign(safeContext, {
        list: fullLister,
        makePagination: () => adultContext.splitToPages(), // deprecated
        splitToPages: pass === 1 ? makeMP(page) : () => { },
        html: page.html,
      });
      // if (pass == 2) console.log("prepared", page.file.path);
      //
      let html = tpl.render("index.njk", adultContext);
      html = postprocess(html, page.file.path, fullLister);
      writeFn(page.file.path, html);
    });
  }
  //passes
  renderList(fullLister, writeFn, 1);
  renderList(virtuals, writeFn, 2);
}
