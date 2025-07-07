const Papa = require("papaparse");
const yaml = require("js-yaml");
import { retrieveByStr, writeObjByKeys } from "./util";
import {
  generateFromCol,
  generateFromRows,
  slugify,
  aggregate,
  sort,
} from "./data_transform";
//
// Data inclusion
//
const datatypeRx = /\.(csv|tsv|json|dsv|yaml)$/i;
const configFile = /data\.config\.(json|yaml)$/i;
var NS = {};
var datasets = {};
var transform_tasks = [];
var rendered = false;
var render_tasks = [];

function parseDataConfig(conf, lang) {
  console.log("Data config file found...");
  let confcontent;
  if (lang === "json") {
    try {
      confcontent = JSON.parse(conf);
    } catch (e) {
      console.log("Can not render data conf (json):", e);
    }
  }
  if (lang === "yaml") {
    try {
      confcontent = yaml.load(conf);
    } catch (e) {
      console.log("Can not render data conf (yaml):", e);
    }
  }
  if (Array.isArray(confcontent)) {
    transform_tasks = confcontent;
  } else {
    console.log("Data config is not an array, left empty.");
  }
  render_tasks = transform_tasks.filter((t) => t.task === "render");
}

function runTransformTasks() {
  transform_tasks.forEach((t) => {
    let ds = retrieveByStr(t.dataset, datasets);
    switch (t.task) {
      case "sort":
        ds = sort(ds, t.col, t.as_number, t.desc);
        break;
      case "slugify":
        ds = slugify(ds, t.input_col, t.output_col);
        // console.log("slugify", ds.slice(0, 5));
        break;
      case "aggregate":
        ds = aggregate(ds, t.type, t.group_by, t.input_col, t.output_col);
        break;
    }
  });
}

function runRenderTasks() {
  let pages = [];
  if (render_tasks.length === 0) {
    console.log("No render tasks.");
    return [];
  }
  render_tasks.forEach((t) => {
    // console.log(t);
    let ds = retrieveByStr(t.dataset, datasets);
    //
    if (!ds || ds.length === 0) {
      console.log("No data in", t.dataset);
      // console.log(datasets);
      return;
    }
    switch (t.type) {
      case "row":
        let lst = generateFromRows(ds, {
          meta: t.meta,
          content: t.content || t.markdown || "",
          path: t.path,
          html: t.html || "",
        });
        pages = pages.concat(lst);
        break;
      case "col":
      case "column":
        let lstc = generateFromCol(ds, t.col, {
          meta: t.meta,
          content: t.content || t.markdown || "",
          path: t.path,
          html: t.html || "",
        });
        pages = pages.concat(lstc);
        break;
    }
  });
  return pages;
}

export function initData(fileList, initialData) {
  if (initialData) {
    datasets = initialData;
  }
  // datafiles is an Array of files
  // fileList is an Array of ↓
  //  { dir , name , getContent() }
  // return data closure
  fileList.forEach((f) => {
    let confm;
    if ((confm = f.name.match(configFile))) {
      parseDataConfig(f.getContent(), confm[1].toLowerCase());
      return;
    }
    const fext = f.name.match(datatypeRx);
    if (!fext) {
      return;
    }
    let ext = fext[1].toLowerCase();
    let dataset_name = f.name.replace(datatypeRx, "");
    let dataset_ns = f.dir ? f.dir.split(/[\\\/]/).filter((f) => f) : [];
    // console.log("ext", ext, "dataset", dataset_name, "ns", dataset_ns);
    //unpack data
    let value = {};
    switch (ext) {
      case "json":
        try {
          value = JSON.parse(f.getContent());
        } catch (e) {
          console.log(e);
        }
        break;
      case "yaml":
        try {
          value = yaml.load(f.getContent());
        } catch (e) {
          console.log(e);
        }
        break;
      default: // all dsv
        // Key data by field name instead of index/position
        let parsed = Papa.parse(f.getContent(), {
          header: true,
          skipEmptyLines: true, //important!
        });
        value = parsed.data;
      // console.log(parsed.meta);
    }
    writeObjByKeys(datasets, dataset_ns, dataset_name, value);
    if (dataset_ns.length > 0) {
      writeObjByKeys(NS, dataset_ns, "", {});
    }
  });
  // console.log(datasets);
  // console.log(NS);
  runTransformTasks();
  return {
    datasets: datasets,
    find: (dataset, column, value) => dataset.filter((r) => r[column] == value),
    render: () =>
      rendered
        ? console.log("Data pages rendering must be done once!")
        : runRenderTasks(),
  };
}
