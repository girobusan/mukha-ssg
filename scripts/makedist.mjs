import fs from "node:fs";
import { execSync } from "node:child_process";
// get version
let version = JSON.parse(fs.readFileSync("package.json")).version;
let files = fs
  .readdirSync("dist", { withFileTypes: true })
  .filter((e) => e.isFile())
  .filter((e) => e.name != "latid2mukha.js")
  .map((e) => e.name);
//
console.log("Packing dist for version", version);
const filename = "mukha." + version + ".dist.zip";
execSync("zip -r " + "../" + filename + " " + files.join(" "), { cwd: "dist" });
console.log("ready...");
