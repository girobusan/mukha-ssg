const Papa = require("papaparse");
const yaml = require("js-yaml");
import { retrieveByStr, writeObjByKeys, isTable } from "./util";
import {
  generateFromCol,
  generateFromRows,
  generateForEachKey,
  slugify,
  aggregate,
  number,
  delCols,
  sort,
} from "./data_transform";
import { saveData4JS, saveGlobalData4JS } from "./js_api";
import { getLogger } from "./logging";
var log = getLogger("data");
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
  log.debug("Data config file found:", lang);
  let confcontent;
  if (lang === "json") {
    try {
      confcontent = JSON.parse(conf);
    } catch (e) {
      log.warn("Can not render data conf (json):", e);
    }
  }
  if (lang === "yaml") {
    try {
      confcontent = yaml.load(conf);
    } catch (e) {
      log.warn("Can not render data conf (yaml):", e);
    }
  }
  if (Array.isArray(confcontent)) {
    transform_tasks = confcontent;
  } else {
    log.warn("Data config is not an array, left empty.");
  }
  render_tasks = transform_tasks.filter((t) => t.task === "render");
}

function runTransformTasks() {
  var tested = {};
  const makeTester = (ds_name, ds_data, tsk) => {
    const isTbl =
      tested[ds_name] !== undefined ? tested[ds_name] : isTable(ds_data);
    if (tested[ds_name] === undefined) tested[ds_name] = isTbl;
    return () => {
      if (!isTbl) {
        log.warn(
          "Dataset is not a table, task",
          tsk.task,
          "is skipped:",
          ds_name,
        );
      }
      return isTbl;
    };
  };
  transform_tasks.forEach((t) => {
    let ds = retrieveByStr(t.dataset, datasets);
    let tester = makeTester(t.dataset, ds, t);

    switch (t.task) {
      case "sort":
        tester() && (ds = sort(ds, t.col, t.as_number, t.desc));
        break;
      case "slugify":
        tester() && (ds = slugify(ds, t.input_col, t.output_col));
        // console.log("slugify", ds.slice(0, 5));
        break;
      case "aggregate":
        tester() &&
          (ds = aggregate(ds, t.type, t.group_by, t.input_col, t.output_col));
        break;
      case "del_cols":
        tester() && (ds = delCols(ds, t.cols));
        break;
      case "number":
        tester() && (ds = number(ds, t.cols));
        break;
      case "pass2js":
      case "save2js":
        saveGlobalData4JS(null, t.dataset, ds);
        break;
      case "render":
        break;
      default:
        log.warn("Unknown task:", t.task);
    }
  });
}

function runRenderTasks() {
  let pages = [];
  if (render_tasks.length === 0) {
    log.debug("No data render tasks.");
    return [];
  }
  log.debug("Render tasks count:", render_tasks.length);
  render_tasks.forEach((t) => {
    // console.log(t);
    let ds = retrieveByStr(t.dataset, datasets);
    //
    if (!ds || Object.keys(ds).length === 0) {
      log.warn("Data: No data for render in", t.dataset);
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
      case "key":
        let lstk = generateForEachKey(ds, {
          meta: t.meta,
          content: t.content || t.markdown || "",
          path: t.path,
          html: t.html || "",
        });
        pages = pages.concat(lstk);
        break;
      default:
        log.warn("Unknown render task type:", t.type);
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
  // return data `closure`
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
          log.warn("Error parsing", f.name, ":", e.message);
        }
        break;
      case "yaml":
        try {
          value = yaml.load(f.getContent());
        } catch (e) {
          log.warn("Error parsing", f.name, ":", e.message);
        }
        break;
      default: // all dsv
        let parsed = Papa.parse(f.getContent(), {
          header: true,
          skipEmptyLines: true, //important!
        });
        if (parsed.errors && parsed.errors.length > 0) {
          log.warn(
            "Errors while parsing",
            f.name,
            ":",
            parsed.errors.map((e) => e.message).join(", "),
          );
          log.warn("Check rows", parsed.errors.map((e) => e.row).join(", "));
        }
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
        ? log.error("Data pages rendering must be done once!")
        : runRenderTasks(),
  };
}
