export function tableFilter(data) {
  var r = `<table>
<thead><tr>`;
  const cols = Object.keys(data[0]);

  cols.forEach((c) => (r += `<th>${c}</th>`));

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
