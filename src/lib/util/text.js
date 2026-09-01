const unidecode = require("unidecode");

export function translit(t, short) {
  let r = unidecode(t.trim())
    .toLowerCase()
    .replace(/\s/g, "_")
    .replace(/[^a-zA-Z0-9-_]/g, "");
  if (short || short === undefined) {
    if (r.length > 100) {
      return r.substring(0, 99);
    }
  }
  return r === "index" ? "index_" : r;
}

export function addNumber(url, number) {
  const r = url.replace(/\.([^.]+)$/, `_${number}.$1`);
  return r;
}

export function niceDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");

  return `${y}.${m}.${d} ${h}:${min}`;
}

export function fitToWidth(text, width) {
  width = width || 80;
  const words = text.split(" ");
  const lines = [];
  let cline = "";
  words.forEach((w) => {
    let draft = cline ? cline + " " + w : w;
    if (draft.length > width) {
      lines.push(cline);
      cline = w;
      return;
    }
    cline = draft;
  });

  lines.push(cline);

  return lines.join(" \n");
}

export function stripHTML(str) {
  if (!str || str.length <= 2) return str;
  let txt = str;

  const rexp = [
    [/<script[^>]*\>.*?<\/script>/gis, " "],
    [/<style[^>]*\>.*?<\/style>/gis, " "],
    [/<noscript[^>]*\>.*?<\/noscript>/gis, " "],
    [/<!--(.*?)-->/gis, " "],
    [/<\/?(p|br|hr|ul|ol|li|div)[^>]*>/gi, " "],
    [/<[^>]*>/gi, ""],
    [/^\s*\n+/gm, ""],
    [/^\s+/gm, ""],
  ];

  rexp.forEach((r) => (txt = txt.replace(r[0], r[1])));
  // console.log(str);
  // console.log("-↓result↓-");
  // console.log(txt);
  // console.log("====");
  return txt.trim();
}

const cleanNonTextTags = (text) => {
  return text
    .replace(/<img\b[^>]*\/?>/gi, "")
    .replace(/<!--[\s\S]*?-->/gs, "")
    .replace(/<(picture|video|audio|small|big)\b[^>]*>[\s\S]*?<\/\1>/gis, "");
};

export function unPara(html) {
  return html
    .trim()
    .replace(/^<p\b[^>]*>/i, "")
    .replace(/<\/p>$/i, "");
}

export function getFirstPara(html) {
  const FP = /<p[^>]*>(.*?)<\/p>/ims;
  const match = FP.exec(html);
  const txt = match ? match[1].trim() : null;
  return txt ? cleanNonTextTags(txt) : "";
}
