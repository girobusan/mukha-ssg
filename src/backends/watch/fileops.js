const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
import { niceDate, absPath } from "../../lib/util";
import { getLogger } from "../../lib/logging";
import { sanitizeFileName } from "../../lib/util";
var log = getLogger("file ops");

export function delFile(fp, in_dir) {
  let fname = path.basename(fp);
  let trashparent = in_dir ? path.dirname(in_dir) : path.normalize(".");
  let trash = path.join(trashparent, "deleted");
  let newdir = path.join(trash, fname);
  if (!fs.existsSync(trash)) {
    log.debug("Trash dir created at:", trash);
    fs.mkdirSync(trash);
  }
  fs.copyFileSync(fp, newdir);
  fs.rmSync(fp, { force: true });
  log.debug("Deleted:", fp);
  return true;
}

export function newPage(near, fname) {
  let cleanName = sanitizeFileName(fname);
  const id = crypto.randomBytes(16).toString("hex");
  const fp = path.join(path.dirname(near), cleanName + ".md");

  const content = `---
title: "Untitled"
tags: 
date: "${niceDate(new Date())}"
id: ${id}
---

Write here
`;

  fs.writeFileSync(fp, content, { encoding: "utf8" });
  return absPath(fp);
}

export function newDir(near, dname) {
  let cleanName = sanitizeFileName(dname);
  let basen = path.dirname(near);
  // log.info("Creating directory:", path.join(basen, cleanName));
  fs.mkdirSync(path.join(basen, cleanName), { recursive: true });
  return newPage(path.join(basen, cleanName, "index.md"), "index");
}
