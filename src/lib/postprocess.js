const path = require("path");

//                            poster, my ass!
const linkRe = /(<[^>]*(src|href|poster)\s*=\s*["'])\s*(.*?)\s*(["'])/gim;

function fixLink(to, from, lister, site_url) {
  let linkedto = to;
  // external link — do not rewrite
  if (!to.startsWith("/")) {
    return to;
  }
  // link to self
  if (to === from) {
    return "javascript:;";
  }

  // slashplus link: /+id:1234 — link to file with id 1234 (id must be in metadata)
  if (to.startsWith("/+")) {
    let linkstr = to.substring(2);
    let splitAt = to.indexOf(":");
    // well formed?
    if (splitAt == -1) {
      console.log("Malformed /+ link at", from, ":", linkstr);
      return to;
    }
    // to what file?
    let parts = [
      linkstr.substring(0, splitAt - 2),
      linkstr.substring(splitAt - 1),
    ].map((p) => p.trim());
    let f = lister.getByMeta(parts[0], parts[1]);
    if (!f) {
      console.log("Can not find target of /+ link from", from, ":", linkstr);
      return to;
    }
    linkedto = f.file.path;
  }
  return site_url
    ? site_url + linkedto
    : path.posix.relative(path.posix.dirname(from), linkedto);
}
/**
 * @param { string } html Text to postprocess
 *  @param { string } pth Path of the file
 *  @param { object } lister Lister of all files
 *  @param { string } site_url Optional, if defined postprocess will output absolute links
 **/

export default function postprocess(html, pth, lister, site_url) {
  if (!site_url) {
    //remove selflink
    const slinkRx =
      /<\s*a\s*[^>]*href\s*=\s*["']\s*(.*?)\s*["'][^>]*>(.*?)<\s*\/\s*a\s*>/gi;
    html = html.replace(slinkRx, (m, g1, g2) =>
      g1 == pth ? '<span class="selflink">' + g2 + "</span>" : m,
    );
  }
  // make links relative
  return html.replace(linkRe, (m, p1, p2, p3, p4) => {
    // p2 is nested in p1
    return p1 + fixLink(p3, pth, lister, site_url || false) + p4;
  });
}
