import { Feed } from "feed";
import { md } from "./markdown";
import postprocess from "./postprocess";

export function makeFeed(lst, config, feeds) {
  let cleanURL = config.url.replace(/\/$/, "");

  let TheFeed = new Feed({
    title: config.title || "My feed",
    description: config.description || config.motto || "Nondescript site",
    id: cleanURL,
    link: cleanURL,
    image: config.image ? cleanURL + (config.image || "") : "",
    author: config.author || "",
  });

  let posts = lst.unwrap().slice(0, config.rss_length || config.feed_length);
  posts.forEach((p) => {
    // :TODO: — remove ↓
    // console.log(p);
    let finalUrl = cleanURL + p.file.path.replace(/\.[^.]+$/, ".html");
    let txt = md.renderInline(p.meta.excerpt || "");
    txt = postprocess(txt, "", lst, cleanURL);
    TheFeed.addItem({
      title: p.meta.title,
      id: finalUrl,
      link: finalUrl,
      description: txt,
      image: p.meta.image ? config.url + p.meta.image : "",
      date: p.meta.date,
    });
  });
  if (feeds) {
    console.log("return feeds");
    return feeds.map((e) => TheFeed[e]());
  }
  console.log("return one feed");

  return TheFeed.rss2();
}
