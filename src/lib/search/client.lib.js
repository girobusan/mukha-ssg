const lunr = require("lunr");
const stemmer = require("lunr-languages/lunr.stemmer.support");
const multi = require("lunr-languages/lunr.multi");
//
function retrieveSearchData() {
  const MAPI = window.Mukha;
  return Promise.all([
    MAPI.getData("index", "search"),
    MAPI.getData("titles", "search"),
    MAPI.getData("setup", "search"),
  ]).catch((e) => console.error(e));
}
//

async function createSearcher() {
  const MAPI = window.Mukha;
  window.lunr = lunr;

  let [index, titles_table, setup] = await retrieveSearchData();

  let titles = titles_table.reduce((a, e) => {
    a[e.path] = e;
    return a;
  }, {});
  //
  const prepResult = (rawResult) => {
    return {
      title: titles[rawResult.ref].title,
      link: MAPI.relpath(window.Mukha.permalink, rawResult.ref),
      excerpt: titles[rawResult.ref].excerpt || null,
    };
  };
  //
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
  let searcher = lunr.Index.load(index);
  const S = (term) => (searcher.search(term) || []).map((e) => prepResult(e));
  return S;
}

module.exports = { createSearcher };
