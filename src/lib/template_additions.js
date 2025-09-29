export function tableFilter(data, columns, titles) {
  if (data.length === 0) {
    return "";
  }
  var r = `<table>
<thead><tr>`;
  const cols = columns || Object.keys(data[0]);

  cols.forEach(
    (c, i) => (r += `<th>${titles && titles[i] ? titles[i] : c}</th>`),
  );

  r += "</tr></thead><tbody>";

  data.forEach((d) => {
    const vals = cols.map((c) => d[c]);
    r += "<tr>\n";
    r += vals.map((v) => `<td>${v}</td>`).join("\n");
    r += "</tr>\n";
  });
  r += "</tbody></table>";

  return r;
}

export function shorten(str, maxln, fin) {
  if (str.trim().length <= maxln) return str;
  let maxLength = maxln || 64;
  let endSymbol = fin || "&hellip;";
  let strArray = str.split(/\s+/i).filter((e) => !e.match(/^\s*$/));
  if (strArray.length === 0) return "";
  if (strArray[0].length === maxLength) return strArray[0] + endSymbol;
  if (strArray[0] > maxLength)
    return strArray[0].substring(0, maxLength) + endSymbol;
  if (strArray.length === 1) return strArray[0] + endSymbol;
  //
  let txt = strArray[0];
  let txt_next = strArray.shift() + " " + strArray.shift() || "";

  while (txt_next.length <= maxLength && strArray.length > 0) {
    txt = txt_next;
    txt_next += " " + strArray.shift();
  }
  return txt_next.length > maxLength ? txt + endSymbol : txt_next + endSymbol;
}
