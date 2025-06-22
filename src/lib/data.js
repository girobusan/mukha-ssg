const Papa = require("papaparse");
const yaml = require("js-yaml");
import { retrieveByStr, writeObjByKeys } from "./util";
import {
  generateFromCol,
  generateFromRows,
  slugify,
  aggregate,
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
  if (lang === "json") {
    try {
      transform_tasks = JSON.parse(conf);
    } catch (e) {
      console.log("Can not render data conf (json):", e);
    }
  }
  if (lang === "yaml") {
    try {
      transform_tasks = yaml.load(conf);
    } catch (e) {
      console.log("Can not render data conf (yaml):", e);
    }
  }
  render_tasks = transform_tasks.filter((t) => t.task === "render");
}

function runTransformTasks() {
  transform_tasks.forEach((t) => {
    let ds = retrieveByStr(t.dataset, datasets);
    switch (t.task) {
      case "slugify":
        ds = slugify(ds, t.input_col, t.output_col);
        // console.log("slugify", ds.slice(0, 5));
        break;
      case "aggregate":
        ds = aggregate(ds, t.type, t.input_col, t.output_col);
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
        value = Papa.parse(f.getContent(), {
          header: true,
        }).data;
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
