const lunr = require("lunr");
const stemmer = require("lunr-languages/lunr.stemmer.support");
const multi = require("lunr-languages/lunr.multi");
const MAPI = window.Mukha;
//
(function () {
  function retrieveSearchData() {
    Promise.all([
      MAPI.getData("index", "search"),
      MAPI.getData("titles", "search"),
      MAPI.getData("setup", "search"),
    ])
      .then((vals) => makeSearcher(vals[0], vals[1], vals[2]))
      .catch((e) => console.error(e));
  }
  //
  async function makeSearcher(index, titles_table, setup) {
    let titles = titles_table.reduce((a, e) => {
      a[e.path] = e;
      return a;
    }, {});
    //
    var Idx = null;
    window.lunr = lunr;
    if (setup.stemmer) stemmer(lunr);

    if (setup.langs) {
      await Promise.all(
        setup.langs.map((l) =>
          l !== "en"
            ? MAPI.attachScript(MAPI.relTo(`/_js/lib/lunr/lang/lunr.${l}.js`))
            : Promise.resolve(true),
        ),
      );
    }
    if (setup.multi) {
      multi(lunr);
      lunr.multiLanguage.apply(this, setup.langs);
    }
    Idx = lunr.Index.load(index);

    let inp = document.querySelector("[data-role='lunr-search']");
    if (!inp) {
      console.info(
        "No search form with data-role='lunr-search', default Lunr UI won't load",
      );
      return;
    }

    const inpBB = inp.getBoundingClientRect();

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
    closeBTN.setAttribute("class", "close_button");
    closeBTN.addEventListener(
      "click",
      () => (results_window.style.display = "none"),
    );
    results_window.appendChild(closeBTN);
    results_window.appendChild(res_content);
    results_window.classList.add("search_results");
    results_window.setAttribute(
      "style",
      "display:none;position:absolute;margin:0 2rem 0 2rem;" +
        "background-color:inherit;border: 1px solid currentColor;" +
        "padding:1rem;",
    );
    results_window.style.top = inpBB.top + inpBB.height + 8 + "px";
    document.body.appendChild(results_window);

    inp.classList.add("enabled-search-form");
    var lastCall = 0;
    //
    inp.addEventListener("input", () => {
      let callTime = new Date().getTime();
      if (callTime - lastCall < 200) return;
      lastCall = callTime;
      if (inp.value.length < 1) {
        results_window.style.display = "none";
        return;
      }
      let rawR = Idx ? Idx.search(inp.value) : [];
      let R = rawR.map((e) => {
        return {
          title: titles[e.ref].title,
          link: MAPI.relpath(window.Mukha.permalink, e.ref),
          excerpt: titles[e.ref].excerpt || null,
        };
      });
      res_content.innerHTML = "";
      if (R.length > 0) {
        results_window.style.display = "block";
        let newHTML = "";
        R.slice(0, 10).forEach(
          (e) =>
            (newHTML += `<div class="search_result"><a href="${e.link}">${e.title}</a>
<div class="search_excerpt">${e.excerpt || ""}</div></div>`),
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
