const Papa = require("papaparse");
const yaml = require("js-yaml");
import { writebyKeys } from "./util";
import { generateFromCol, generateFromRows, slugify } from "./data_transform";
//
// Data inclusion
//
const datatypeRx = /\.(csv|tsv|json|dsv|yaml)$/i;
var datasets = {};
var tasks = [];
var rendered = false;
var render_tasks = [];

function parseConfig(conf) {
  console.log("Data config file found...");
  tasks = yaml.load(conf);
  render_tasks = tasks.filter((t) => t.task === "render");
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
    if (f.name === "data.config.yaml") {
      return parseConfig(f.getContent());
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
    writebyKeys(datasets, dataset_ns, dataset_name, value);
  });
  // console.log(datasets);
  return {
    datasets: datasets,
    find: (dataset, column, value) => dataset.filter((r) => r[column] == value),
    render: (lister) =>
      rendered
        ? console.log("Data pages rendering must be done once!")
        : console.log("Request to execute renders..."),
  };
}
