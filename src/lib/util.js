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

export function lowercaseKeys(obj) {
  let r = {};
  for (const [k, v] of Object.entries(obj)) {
    r[k.toLowerCase()] = v;
  }
  return r;
}

export function makePageLikeObj(meta, markdown, path, html) {
  return {
    meta: meta,
    content: markdown,
    html: html || "",
    file: {
      getContent: () => content,
      path: path,
    },
  };
}

export function cloneFile(f) {
  let clone = Object.assign({}, f);
  clone.meta = Object.assign({}, f.meta);
  clone.file = Object.assign({}, f.file);
  return clone;
}

export function rangeArray(start, length) {
  let r = [];
  for (let i = 0; i < length; i++) {
    r.push(i + start);
  }
  return r;
}

export function niceDate(date) {
  return (
    date.getFullYear() +
    "." +
    (date.getMonth() + 1 + 100).toString().substring(1) +
    "." +
    date.getDate() +
    " " +
    date.getHours() +
    ":" +
    date.getMinutes()
  );
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

export function writeObjByKeys(obj, keysArray, name, value) {
  if (!name && keysArray.length == 0) {
    throw "Can not write to object";
  }
  if (!name && keysArray.length > 1) {
    name = keysArray.pop();
  }
  if (!keysArray || keysArray.length == 0) {
    obj[name] = value;
    return obj;
  }
  let cursor = keysArray.reduce((a, e) => {
    if (!a[e]) {
      a[e] = {};
    }
    return a[e];
  }, obj);
  cursor[name] = value;
  return obj;
}

export function retrieveByStr(str, obj, sep) {
  const separator = sep || ".";
  let steps = str.split(separator).filter((e) => e);
  return steps.reduce((a, e) => (a ? a[e] : undefined), obj);
}

export function median(numbers) {
  const sorted = Array.from(numbers).sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

export function formatLastModified(date) {
  if (!(date instanceof Date)) {
    throw new TypeError("Аргумент должен быть объектом Date");
  }

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const day = weekdays[date.getUTCDay()];
  const dateNum = date.getUTCDate().toString().padStart(2, "0");
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  const seconds = date.getUTCSeconds().toString().padStart(2, "0");

  return `${day}, ${dateNum} ${month} ${year} ${hours}:${minutes}:${seconds} GMT`;
}
