const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
import { niceDate } from "../../lib/util";
import { getLogger } from "../../lib/logging";
var log = getLogger("file ops");

export function delFile(fp, in_dir) {
  let fname = path.basename(fp);
  let newdir = path.join("deleted", fname);
  let trashparent = in_dir ? path.dirname(in_dir) : path.normalize(".");
  let trash = path.join(trashparent, "deleted");
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
  const id = crypto.randomBytes(16).toString("hex");
  const fp = path.join(path.dirname(near), fname + ".md");
  const content = `---
title: "Untitled"
tags: 
date: "${niceDate(new Date())}"
id: ${id}
---

Write here
`;

  fs.writeFileSync(fp, content, { encoding: "utf8" });
  return fp;
}
