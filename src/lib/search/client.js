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
    const RW = document.createElement("div");
    RW.classList.add("search_results");
    RW.style.display = "none";
    RW.style.position = "absolute";
    RW.style.top = inpBB.top + inpBB.height + "px";
    if (inpBB.right < 100) {
      RW.style.right = inpBB.right + "px";
    } else {
      RW.style.left = inpBB.left + "px";
    }
    RW.style.backgroundColor = "inherit";
    RW.style.border = "1px solid currentColor";
    RW.style.padding = "1rem";
    document.body.appendChild(RW);

    inp.classList.add("enabled-search-form");
    inp.addEventListener("input", () => {
      if (inp.value.length < 1) {
        RW.style.display = "none";
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
      // console.log(rawR);
      RW.innerHTML = "";
      if (R.length > 0) {
        RW.style.display = "block";
        R.slice(0, 10).forEach(
          (e) =>
            (RW.innerHTML += `<a href="${e.link}">${e.title}</a><div>${e.excerpt || ""}</div>`),
        );
      } else {
        RW.style.display = "none";
        RW.innerHTML = "";
      }
    });
  }
  if (window.document.readyState === "complete") {
    retrieveSearchData();
  } else {
    document.addEventListener("DOMContentLoaded", retrieveSearchData);
  }
})();
