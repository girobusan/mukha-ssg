const yaml = require("js-yaml");
import { extractFM } from "./fm_extractor";
import { makeLister } from "./list";
import { makeFeed } from "./feeds";
import { makeTags } from "./tags";
import { renderAndSave } from "./templates";
import { JSAPI } from "./js_api";
// import postprocess from "./postprocess";
import { getLogger } from "./logging";
var log = getLogger("preprocess");

const mdfileRx = /\.(md|markdown)$/i;
// const paragraphRx = /^([^-![{<#])(.+?)\n\n/gm;
const paragraphRx = /(\n\n|^)([^-~`![\](\){\}<#].+?)\n\n/gs;
const imageRx = /!\[.*?\]\s*\((.*?)\)/m;
const realImageRx = /[("](\/[^[\](\)"']+\.(jpg|jpeg|png|gif|webm|svg))/i;
const indexRx = /index\.html?$/i;

function parseDate(dt) {
  // console.log(dt);
  if (typeof dt !== "string") {
    return dt;
  }
  let dateParts = dt.split(/\D+/).map((e) => +e);
  let r;
  try {
    r = new Date(
      dateParts[0],
      dateParts[1] - 1,
      dateParts[2],
      dateParts[3] || 0,
      dateParts[4] || 0,
    );
  } catch (e) {
    log.warn("Wrong data:", dt);
    r = new Date(0);
  }
  return r;
}

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
  if (metadata.date && typeof metadata.date === "string") {
    metadata.date = parseDate(metadata.date);
  }
  if (!metadata.date) metadata.date = new Date(0);
  return { file: f, meta: metadata, content: parts.markdown };
}

function sortAndRun(lst, writeFn, config, templates, data) {
  // sort by date
  lst.sort((a, b) => {
    const atime = a.meta.date.getTime();
    const btime = b.meta.date.getTime();
    return Math.sign(btime - atime);
  });
  // search for excerpts
  lst.forEach((page) => {
    if (page.meta.excerpt === undefined && page.content) {
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
    let img = realImageRx.exec(page.content);
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
    log.debug("Writting RSS...");
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
  log.debug("Preparing to render html...");
  renderAndSave(lister, config, templates, writeFn, data);
}

export function preprocessFileList(lst, writeFn, config, templates, data) {
  let timeFrame = config.timed ? new Date().getTime() : Infinity;
  let copyList = [];
  let processList = [];

  const data_pages = data.render();
  if (data_pages.length > 0) {
    log.debug("Pages rendered from data:", data_pages.length);
    data_pages.forEach((dp) => {
      if (!dp.meta.date) {
        dp.meta.date = new Date(0);
        return;
      }
      dp.meta.date = parseDate(dp.meta.date);
    });
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
    preparsed.permalink = preparsed.file.path;
    if (preparsed.file.path.match(indexRx)) preparsed.index = true;
    let skipIt =
      preparsed.meta.date && preparsed.meta.date.getTime() > timeFrame;
    skipIt = skipIt || preparsed.meta.draft;
    if (!skipIt) {
      processList.push(preparsed);
    } else {
      log.debug("Skipping, draft or timed:", preparsed.file.path);
    }
  });
  processList = processList.concat(data_pages);
  log.debug("Source files to process:", processList.length);
  sortAndRun(processList, writeFn, config, templates, data);
  return copyList;
}
