const fs = require("fs");
const path = require("path");
const { parseArgs } = require("node:util");
import { convertBlocks, convertJson } from "./convertor/json_convert";
/*
 
-i — input dir
-o — output dir

*/

function testJSON(fn) {
  const fc = fs.readFileSync(fn);
  let obj = null;
  try {
    obj = JSON.parse(fc);
  } catch {
    return null;
  }
  if (!obj.meta || !obj.content) {
    return null;
  }
  return obj;
}

const options = {
  input: { type: "string", short: "i" },
  output: { type: "string", short: "o" },
};

const V = parseArgs({ options });
const inDir = V.values.input || "old";
const outDir = V.values.output || "converted";

if (!inDir || !outDir) {
  console.log("Specify directory!");
  process.exit(1);
}
//create

// get the list of files (node 20+ required)

const files = fs
  .readdirSync(inDir, { recursive: true, withFileTypes: true })
  .filter((f) => f.isFile())
  .map((f) => {
    return {
      src: path.join(f.parentPath, f.name),
      dir: f.parentPath.substring(inDir.length),
      file: f.name,
      full: path.join(f.parentPath, f.name).substring(inDir.length),
    };
  });

console.log("Files count:", files.length);
// console.log(files.slice(0, 50).join("\n"));
files.forEach((f) => {
  let outdir = path.join(outDir, f.dir);
  fs.mkdirSync(outdir, { recursive: true });
  //
  if (f.file.toLowerCase().endsWith(".json")) {
    const obj = testJSON(f.src);
    if (obj) {
      let outputPath = path.join(outDir, f.full.replace(/json$/i, "md"));
      let content = convertJson(obj);
      fs.writeFileSync(outputPath, content);
      return;
    }
  }
  fs.copyFileSync(f.src, path.join(outDir, f.full));
});
