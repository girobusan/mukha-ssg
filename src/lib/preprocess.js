const yaml = require("js-yaml");
import { extractFM } from "./fm_extractor";
import { makeLister } from "./list";
import { makeFeed } from "./feeds";
import { makeTags } from "./tags";
import { renderAndSave } from "./templates";
// import postprocess from "./postprocess";

const mdfileRx = /\.(md|markdown)$/i;
// const paragraphRx = /^([^-![{<#])(.+?)\n\n/gm;
const paragraphRx = /(\n\n|^)([^-![\](\){\}<#].+?)\n\n/gs;
const imageRx = /!\[.*?\]\s*\((.*?)\)/m;
const indexRx = /index\.html?$/i;

/**
 * @param { Object[] } lst - list of file info objects
 * @param {function} writeFn — function, which writes content by site path
 * @param { object} config - site configuration
 */

function preparseMdFile(f) {
  let content = f.getContent();
  f.getContent = () => content;
  // console.log(content);
  let parts = extractFM(content);
  if (!parts.meta) {
    return { file: f, meta: null, content: content };
  }
  const metadata = yaml.load(parts.meta);
  if (!metadata.title) {
    return { file: f, meta: null, content: content };
  }
  return { file: f, meta: metadata, content: parts.markdown };
}

function sortAndRun(lst, writeFn, config, templates, data) {
  //render data
  // fix date
  let today = new Date();
  lst.forEach((page) => {
    if (page.meta.date && typeof page.meta.date === "string") {
      let dateParts = page.meta.date.split(/\D+/).map((e) => +e);
      page.meta.date = new Date(
        dateParts[0],
        dateParts[1] - 1,
        dateParts[2],
        dateParts[3] || 0,
        dateParts[4] || 0,
      );
    }
    if (!page.meta.date) {
      page.meta.date = new Date(42);
    }
  });
  // filter future posts if timed option is set
  if (config.timed) {
    lst = lst.filter((p) => {
      try {
        if (p.meta.date.getTime() > today.getTime()) {
          return false;
        }
      } catch (e) { }
      return true;
    });
  }
  // sort by date
  lst.sort((a, b) => {
    const atime = a.meta.date.getTime();
    const btime = b.meta.date.getTime();
    return Math.sign(btime - atime);
  });
  // search for excerpts
  lst.forEach((page) => {
    if (!page.meta.excerpt && page.content) {
      // console.log(f);
      let firstP = page.content.match(paragraphRx);
      if (!firstP) {
        return;
      }
      // console.log("Excerpt found", firstP[0]);
      page.meta.excerpt = firstP[0].trim();
    }
  });
  // find images
  lst.forEach((page) => {
    if (page.meta.image) {
      return;
    }
    let img = imageRx.exec(page.content);
    if (!img) {
      return;
    }
    page.meta.image = img[1];
  });
  // if timed option is
  //...and...
  // wrap to lister
  // for future operations
  let lister = makeLister(lst);
  //must be ok to build rss
  if (config.rss_length) {
    console.info("Writting RSS...");
    let feeds = [];
    let uris = [];
    if (config.rss_uri) {
      feeds.push("rss2");
      uris.push(config.rss_uri);
    }
    if (config.atom_uri) {
      feeds.push("atom1");
      uris.push(config.atom_uri);
    }
    let feeds_content = makeFeed(lister, config, feeds);
    uris.forEach((u, i) => writeFn(u, feeds_content[i]));
  }
  // console.log("We have", lister.length, "pages to process");
  // tags
  lister = makeTags(lister, config);
  // templating
  renderAndSave(lister, config, templates, writeFn, data);
}

export function preprocessFileList(lst, writeFn, config, templates, data) {
  let copyList = [];
  let processList = [];
  const data_pages = data.render();
  if (data_pages.length > 0) {
    console.log("Rendered from data:", data_pages.length);
  }

  // GENERATE LIST OF OUTPUT FILES, INCLUDING
  //  - tags pages
  lst.forEach((f) => {
    if (!f.name.match(mdfileRx)) {
      copyList.push(f);
      return;
    }
    //we need to read
    const preparsed = preparseMdFile(f);
    if (!preparsed.meta) {
      copyList.push(f);
      return;
    }
    // path on site will be html
    preparsed.file.path = preparsed.file.path.replace(/\.[^.]+$/, ".html");
    if (preparsed.file.path.match(indexRx)) preparsed.index = true;
    processList.push(preparsed);
  });
  processList = processList.concat(data_pages);
  console.info("Source files to process:", processList.length);
  sortAndRun(processList, writeFn, config, templates, data);
  return copyList;
}
