const path = require("path");
const fs = require("fs");
var readlineSync = require("readline-sync");
import { dump } from "js-yaml";

const njk = require("../../site_tpl/site/config/themes/bland/templates/index.njk?raw");
const idx = `---
title: Welcome!
tags: frontpage
---
Welcome to your newly created site
`;
const dirs = [
  ["config"],
  ["src"],
  ["assets"],
  ["config", "themes"],
  ["config", "themes", "bland"],
  ["config", "themes", "bland", "templates"],
];

export function makeSiteAt(pth) {
  var sitedirname = "mysite";
  var conf = {
    title: "Very New One",
    motto: "Fresh and empty!",
    url: "",
    theme: "bland",
    description: "",
    list_length: 10,
    tags_dir: "/tags",
    tags_page: "/tags/index.html",
  };
  sitedirname = readlineSync.question("Site directory name:") || sitedirname;
  conf.title = readlineSync.question("Site title:") || conf.title;
  conf.url = readlineSync.question("Site url:");
  conf.motto = readlineSync.question("Short motto, if you wish:") || conf.motto;
  // readline.close();
  // console.log("We will create the site!");
  let conftxt = dump(conf);
  //
  let based = path.join(sitedirname, "site");
  //
  if (!fs.existsSync(sitedirname)) fs.mkdirSync(sitedirname, { force: true });
  if (!fs.existsSync(based)) fs.mkdirSync(based, { force: true });
  dirs.forEach((da) => {
    let d = path.join(based, ...da);
    console.log("creating", d);
    if (!fs.existsSync(d)) fs.mkdirSync(d, { force: true });
  });
  try {
    fs.writeFileSync(path.join(based, "config", "site.yaml"), conftxt, {
      force: true,
      recursive: true,
    });
    fs.writeFileSync(
      path.join(based, "config", "themes", "bland", "templates", "index.njk"),
      njk,
    );
    fs.writeFileSync(path.join(based, "src", "index.md"), idx);
  } catch (e) {
    console.log("Can not write some files:", e.message);
  }
  console.log();
  console.log("Your site is ready. To view:");
  console.log(`  cd ${sitedirname}
  mukha-ssg -w
`);
}
