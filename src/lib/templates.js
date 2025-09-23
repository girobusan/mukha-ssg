const nunjucks = require("nunjucks");
import { format as dateFormat } from "date-fns";
import { makeLister, LISTER_TAG } from "./list";
import { tableFilter } from "./template_additions";
import { md2html } from "./md_parser";
import {
  addNumber,
  cloneFile,
  niceDate,
  rangeArray,
  retrieveByStr,
} from "./util";
import { generate as makePaginationSeq } from "./pagination/pagination";
import postprocess from "./postprocess";
import { indexAll } from "./search";
import { saveLocalData4JS } from "./js_api";
import { getLogger } from "./logging";
var log = getLogger("templates");
var dlog = getLogger("tpl-debug");

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
  log.debug("Rendering html for", fullLister.length, "pages");
  // Environment
  const objLoader = makeObjectLoader(templates);
  const tpl = new nunjucks.Environment([objLoader], {
    autoescape: false,
    trimBlocks: true,
    lstripBlocks: true,
  });
  tpl.addFilter("to_table", tableFilter);
  tpl.addFilter("shorten", function (str, count) {
    return str.slice(0, count || 5);
  });

  let virtuals = [];
  //
  // creates fn
  // which makes multipage list
  // for file
  function makeMP(f) {
    return function (lst, length) {
      if (f.page_count) {
        log.warn("Split to pages more than once, skipping:", f.file.path);
        return;
      }
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
        clone.list_page = lst.slice(i * onPage, (i + 1) * onPage);

        // console.log("CLONE", clone);
        virtuals.push(clone);
      });
    };
  }

  function makeSafeContext(page, pass) {
    let safeContext = {
      config: config,
      datasets: data.datasets,
      data: data,
      splitToPages: pass && pass === 1 ? makeMP(page) : () => {},
      // splitToPages: () =>
      //   log.warn(
      //     "Attempt to call unsafe function in safe context",
      //     page.file.path,
      //   ),
      meta: page.meta,
      path: page.file.path,
      list: fullLister,
      file: page, // deprecated
      page: page, // — must be page
      saveData: (name, dt) => saveLocalData4JS(name, dt, page.file.path),
      util: {
        niceDate: niceDate,
        dateFormat: (dt, fmt, opts) => dateFormat(dt, fmt, opts),
        makeTable: (d) => tableFilter(d),
        debugObj: (o) => dlog.info(JSON.stringify(o, null, 2)),
        debug: function () {
          dlog.info.apply(this, arguments);
        },
        groupBy: (d, keyPath) => {
          // console.log(d);
          var arr = d;
          if (d[LISTER_TAG]) {
            arr = d.unwrap();
            // remove later
            arr.unwrap = () => arr;
          }
          const res = arr.reduce((a, e) => {
            const groupKey = retrieveByStr(keyPath, e);
            (a[groupKey] ??= []).push(e);
            return a;
          }, {});

          return Object.values(res);
        },
        // roolup: safeContext.util.groupBy,
        unique: (d, key) => {
          const set = new Set();
          for (const e of d) {
            if (e?.[key] != null) set.add(e[key]);
          }
          return [...set];
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
    return safeContext;
  }

  function renderList(list, writeFn, secondary) {
    //render exerpts and content
    // if (pass == 1) {
    //if (true) {
    let pass = secondary ? 2 : 1;

    list.forEach((page) => {
      let SC = makeSafeContext(page, pass);

      if (!secondary && page.meta.excerpt) {
        page.meta.excerpt = md2html(page.meta.excerpt);
        try {
          page.meta.excerpt = tpl.renderString(page.meta.excerpt, SC);
        } catch (e) {
          log.warn(
            "Can not render template tags in excerpt ",
            page.file.path,
            e.message,
            "\n" + page.meta.excerpt,
          );
        }
      }
      if (page.html && !page.content) {
        //
        log.warn("Orphaned html in:", page.file.path);

        try {
          // no need to render when clones are rendered
          if (!secondary) page.html = tpl.renderString(page.html, SC);
        } catch (e) {
          log.warn(
            "Template tags in static html error",
            page.file.path,
            e.message,
          );
        }
      }

      if (page.meta.html && page.content) {
        try {
          page.html = tpl.renderString(page.content, SC);
        } catch (e) {
          log.warn("Template tags in html error", page.file.path, e.message);
        }
      }
      // else {
      if (!page.meta.html && page.content) {
        try {
          let renderedInMd = tpl.renderString(page.content, SC);
          page.html = md2html(renderedInMd);
        } catch (e) {
          log.warn(
            "Malformed template tags in markdown at",
            page.file.path,
            e.message,
          );
          page.html = md2html(page.content);
        }
      }
      // }
    });
    //}//end if(true)

    //render full pages
    //
    list.forEach((page) => {
      const JSAPI = config.js_api
        ? `<script data-location="${page.file.path}" src="/_js/client.js"></script>`
        : "<!--js api off--->";
      //
      let adultContext = Object.assign(makeSafeContext(page, pass), {
        // list: fullLister,
        // splitToPages: pass === 1 ? makeMP(page) : () => {},
        html: page.html,
        js_api: JSAPI,
        jsapi: JSAPI, // TODO: remove
      });
      let html = tpl.render("index.njk", adultContext);
      html = postprocess(html, page.file.path, fullLister);
      writeFn(page.file.path, html, page);
    });
  }
  //passes
  renderList(fullLister, writeFn, false);
  renderList(makeLister(virtuals), writeFn, true);
  if (config.search && config.js_api)
    indexAll(fullLister, config.keep_excerpts, config.search_lang || null);
}
