export function tableFilter(data, columns, col_names) {
  if (data.length === 0) {
    return "";
  }
  var r = `<table>
<thead><tr>`;
  const cols = columns || Object.keys(data[0]);

  cols.forEach(
    (c, i) => (r += `<th>${col_names && col_names[i] ? col_names[i] : c}</th>`),
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
