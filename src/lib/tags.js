import path from "path";
import { translit, makePageLikeObj } from "./util";
import { makeLister } from "./list";

/**
 *
 *@param {Lister} lister
 *@param {object} config
 * */

export function makeTags(lister, config) {
  //list pages by tag
  const tags = {};
  //dict of tag titles
  const tags_titles = {};
  //gather tags info
  lister.forEach((f) => {
    if (!f.meta.tags) {
      return;
    }
    const pretags = f.meta.tags
      .split(",")
      .map((t) => t.trim())
      .map((t) => t)
      .map((t) => {
        return { name: t, slug: translit(t) };
      });
    pretags.forEach((obj) => {
      if (!tags[obj.slug]) {
        tags[obj.slug] = [];
        //use first tag entry title
        tags_titles[obj.slug] = obj.name;
      }
      tags[obj.slug].push(f);
    });
    f.meta.tags = pretags;
  });
  // create tag pages
  let tag_pages = Object.entries(tags)
    .map(([slug, files]) => {
      const tagpath = path.posix.join(
        config.tags_dir || "/tag",
        slug + ".html",
      );
      //is there such file?
      let physical_tag = lister.getByPath(tagpath);
      if (physical_tag) {
        physical_tag.list = files;
        physical_tag.tag = slug;
        physical_tag.meta.tag = slug;
        return physical_tag; //filter out later
      }
      let tag_page = makePageLikeObj({ title: tags_titles[slug] }, "", tagpath);
      tag_page.virtual = true;
      tag_page.list = files;
      tag_page.tag = slug;
      tag_page.meta.tag = slug;
      return tag_page;
    })
    .filter((e) => e);
  // update tags meta for all files
  let tagLister = makeLister(tag_pages);

  lister.forEach((f) => {
    if (!f.meta.tags) {
      return;
    }
    f.meta.tags = f.meta.tags.map((tg) => {
      return tagLister.getByMeta("tag", tg.slug);
    });
  });
  if (config.tags_page) {
    let tags_index = lister.getByPath(config.tags_page);

    if (tags_index) {
      // :TEST:
      tags_index.list = tagLister.tags(); //sortByMeta("title", false, false);
    }
  }

  //append all tag pages exept physical ones
  //because phycical are already there
  console.log("Tags found:", tag_pages.length);

  return lister.append(tag_pages.filter((t) => t.virtual));
}
