import { md } from "./markdown";
import { extractFM } from "./fm_extractor";
import { runInsert } from "./inserts";
const yaml = require("js-yaml");
//
// render nd with add goodies (exept nunjucks syntax)
//
const helperRx =
  /^<!--\s*(h:|!|@)([a-zA-Z_0-9-]+)\s*-->(.+?)<!--\s*\/\/\s*-->/gms;
const fencedRx = /`{3,5}\n(.*?)`{3,5}\n/ms;
//
const shortenSyntaxRx = /^```@([a-zA-Z0-9-_]+)\n(.*?)\n```$/gms;

export function md2html(md_src) {
  if (!md_src) {
    return "";
  }
  md_src.replace(/<!--##?\d+##?-->/g, ""); // no jokes here
  //extract all inserts — full syntax
  let inserts_full = [];
  //replace them in md with marker <!--#{number}#-->
  let newMd = md_src.replace(helperRx, (m, g1, g2, g3) => {
    let prms_found = g3.match(fencedRx);
    let parameters = prms_found ? yaml.load(prms_found[1]) : {};
    inserts_full.push(runInsert(g2, g3.replace(fencedRx, ""), parameters) || m);
    return `<!--#${inserts_full.length - 1}#-->`;
  });
  // extract all inserts — shorten syntax
  let inserts_short = [];
  //replace them in md with marker <!--##{number}##-->
  newMd = newMd.replace(shortenSyntaxRx, (m, g1, g2) => {
    let guessParams = false;
    try {
      guessParams = yaml.load(g2);
    } catch (e) {
      // console.error(e);
    }
    inserts_short.push(runInsert(g1, g2, guessParams) || m);
    return `<!--##${inserts_short.length - 1}##-->`;
  });
  let newHTML;
  try {
    newHTML = md.render(newMd);
  } catch (e) {
    console.log("Markdown render error", e);
  }
  // replace markers with inserts result
  try {
    newHTML = newHTML.replace(
      /<!--##(\d+)##-->/g,
      (_, g1) => inserts_short[+g1],
    );
    newHTML = newHTML.replace(/<!--#(\d+)#-->/g, (_, g1) => inserts_full[+g1]);
  } catch (e) {
    console.log("Inserts insertion error", e);
  }
  return newHTML;
}
