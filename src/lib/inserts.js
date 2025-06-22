/*
 + QUOTE           
 + AUDIO           
 + VIDEO           
 + badge           
 ------------
 o attachment      
 ------------
 + IMAGE           
*/

import { lowercaseKeys } from "./util";
import { md } from "./markdown";

function media(type, src, in_attrs) {
  const attrs = lowercaseKeys(in_attrs);
  const attrs_bool = ["autoplay", "loop", "controls", "muted"];
  const attrs_value = ["width", "height", "preload", "poster"];
  // console.log(src);
  let attr_str = "";
  attrs_bool.forEach((a) => {
    if (attrs[a]) {
      attr_str += a + " ";
    }
  });
  attrs_value.forEach((a) => {
    if (attrs[a]) {
      attr_str += a + "='" + attrs[a] + "' ";
    }
  });
  return `<${type} ${attr_str}>
   ${src.map((s) => `  <source src="${s}" />`).join("\n")}
</${type} > `;
}

const inserts = {
  image: (_, params) => {
    //try to find image in md?
    let alt_txt = (params.alt || params.caption || "").replace(/<[^>]*>/g, "");
    //
    return `<figure class="image ${params.classes || ""}">
    ${params.link ? `<a href="${params.link}">` : ""}
  <img src="${params.url}" alt="${alt_txt}" />
      ${params.link ? `</a>` : ""} 
${params.caption ? `<figcaption>${params.caption}</figcaption>` : ""}
</figure > `;
  },

  quote: (_, params) => {
    return `<figure class="quote" >
  <blockquote>${params.text}</blockquote>
${params.caption ? `<figcaption>${params.caption}</figcaption>` : ""}
</figure > `;
  },
  video: (_, params) => {
    // console.log(params);
    if (params.src && !params.urls) {
      params.urls = params.src;
    }
    return media(
      "video",
      Array.isArray(params.urls) ? params.urls : [params.urls],
      params,
    );
  },
  audio: (_, params) => {
    if (params.src && !params.urls) {
      params.urls = params.src;
    }
    return media(
      "audio",
      Array.isArray(params.urls) ? params.urls : [params.urls],
      params,
    );
  },
  badge: (m, params) => {
    return `<div class="badge ${params.className || params.class}" > ${md.renderInline(m)}</div>`;
  },
  raw: (m) => {
    return m;
  },
  attachment: (m, params) => {
    return `<div class="file-attachment ${params.className}">
<a href="${params.url}">${params.title || params.url}</a>
</div>`;
  },
};

export function runInsert(name, md, params) {
  if (!(name in inserts)) {
    return "Unknown insert: " + name;
  }
  // console.log(name, md, params);
  return inserts[name](md, params);
}
