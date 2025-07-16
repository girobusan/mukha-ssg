import { Index } from "lunr";
(function() {
  function retrieveSearchData() {
    Promise.all([
      window.Mukha.getData("index", "search"),
      window.Mukha.getData("titles", "search"),
    ])
      .then((vals) => makeSearcher(vals[0], vals[1]))
      .catch((e) => console.error(e));
  }
  //
  function makeSearcher(index, titles_table) {
    let titles = titles_table.reduce((a, e) => {
      a[e.path] = e;
      return a;
    }, {});
    let inp = document.querySelector("[data-role='lunr-search']");
    if (!inp) {
      console.warn("No search form with data-role='lunr-search'");
      return;
    }
    const inpBB = inp.getBoundingClientRect();
    const Idx = Index.load(index);
    const results_window = document.createElement("div");
    const res_content = document.createElement("div");
    const closeBTN = document.createElement("button");
    closeBTN.innerHTML = "×";
    closeBTN.setAttribute(
      "style",
      "border:none;background:none;float:right;clear: both;font-size:1.5em;cursor:pointer;" +
      "padding:0;margin:0;line-height:50%",
    );
    closeBTN.setAttribute("title", "close");
    closeBTN.addEventListener(
      "click",
      () => (results_window.style.display = "none"),
    );
    results_window.appendChild(closeBTN);
    results_window.appendChild(res_content);
    results_window.classList.add("search_results");
    results_window.style.display = "none";
    results_window.style.position = "absolute";
    results_window.style.top = inpBB.top + inpBB.height + 8 + "px";
    results_window.style.marginLeft = "2rem";
    results_window.style.marginRight = "2rem";
    results_window.style.backgroundColor = "inherit";
    results_window.style.border = "1px solid currentColor";
    results_window.style.padding = "1rem";
    document.body.appendChild(results_window);

    inp.classList.add("enabled-search-form");
    var lastCall = 0;
    inp.addEventListener("input", () => {
      let callTime = new Date().getTime();
      if (callTime - lastCall < 200) return;
      lastCall = callTime;
      if (inp.value.length < 1) {
        results_window.style.display = "none";
        return;
      }
      let rawR = Idx.search(inp.value);
      let R = rawR.map((e) => {
        return {
          title: titles[e.ref].title,
          link: window.Mukha.relpath(window.Mukha.permalink, e.ref),
          excerpt: titles[e.ref].excerpt || null,
        };
      });
      res_content.innerHTML = "";
      if (R.length > 0) {
        results_window.style.display = "block";
        let newHTML = "";
        R.slice(0, 10).forEach(
          (e) =>
            (newHTML += `<a href="${e.link}">${e.title}</a><div class="search_excerpt">${e.excerpt || ""}</div>`),
        );
        res_content.innerHTML = newHTML;
      } else {
        results_window.style.display = "none";
        res_content.innerHTML = "";
      }
    });
  }
  if (window.document.readyState === "complete") {
    retrieveSearchData();
  } else {
    document.addEventListener("DOMContentLoaded", retrieveSearchData);
  }
})();
