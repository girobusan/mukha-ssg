import { dump } from "js-yaml";
import { fitToWidth } from "../lib/util.js";
console.log(fitToWidth("Fit to width"));

function boolList(list, obj) {
  return list.filter((e) => obj[e]);
}

function unBR(txt) {
  // console.log("inbr", txt);
  if (!txt) return "";
  return txt.replace(/<br\/?>\s*$/g, "").replace(/\n/g, "");
}
function stripTags(txt) {
  // console.log("striptgs");
  if (!txt) {
    return "";
  }
  let newTxt = txt.replace(/\n/g, "");
  return newTxt.replace(/<[^>]*>/g, "");
}

const fence = "```";

const helpers = {
  attachment: (url, title, className) => {
    return `
<!--@attachment-->
[${title || url}](${url})

${fence}
${dump({ title, url, className })}
${fence}
<!--//-->
 
`;
  },
  quote: (text, caption) => {
    return `
<!--@quote-->
> ${text}
>
> _${caption}_

${fence}
${dump({ text, caption })}
${fence}
<!--//-->

`;
  },

  media: (type, title, urls, autoplay, loop, controls, preload) => {
    return `
<!--@${type}-->
[${title || type}](${urls[0]})

${fence}
${dump({ urls, autoplay, loop, controls, preload })}
${fence}
<!--//-->

`;
  },
  image: (caption, url, link, classes) => {
    let imgtag = link
      ? `[![${caption || ""}](${url})](${link})${caption || ""}`
      : `![${caption || ""}](${url})${caption || ""}`;
    return `
<!--@image-->
${imgtag}

${fence}
${dump({ caption: caption || "", url: url, link: link, classes: classes })}
${fence}
<!--//-->

`;
  },
};

export function convertBlocks(blocks) {
  let txt = "";
  blocks.forEach((blk) => {
    let t = blk.type;
    let b = blk.data;
    switch (t) {
      //simple ones
      case "paragraph":
        txt += fitToWidth(unBR(b.text.trim())) + "\n\n";
        break;
      case "markdown":
        txt += b.markdown + "\n\n";
        break;
      case "code":
        txt += "```\n" + unBR(b.code) + "\n```\n\n";
        break;
      case "header":
        txt +=
          "#######".substring(0, +b.level) + " " + stripTags(b.text) + "\n\n";
        break;
      case "list":
        let lt = b.style === "ordered" ? "1. " : "* ";
        txt += b.items.map((i) => `${lt}${unBR(i)}`).join("\n");
        txt += "\n\n";
        break;
      // complicated
      case "video":
        txt += helpers.media(
          "video",
          b.caption,
          [b.file.url],
          b.autoplay,
          b.loop,
          b.controls,
          b.preload,
        );
        break;
      case "audio":
        txt += helpers.media(
          "audio",
          b.caption,
          [b.file.url],
          b.autoplay,
          b.loop,
          b.controls,
          b.preload,
        );
        break;
      case "attachment":
        if (!b.hidden) {
          txt += helpers.attachment(b.href, b.title || b.filename, b.class);
        } else {
          txt += "\n\n" + `<!--attached: ${b.url || b.href}-->` + "\n\n";
        }
        break;
      case "image":
        const classes = boolList(
          ["left", "right", "stretched", "noresize", "border"],
          b,
        );

        txt += helpers.image(unBR(b.caption), b.file.url, b.link, classes);
        break;

      case "quote":
        txt += helpers.quote(b.text, b.caption);
        break;

      case "divider":
        txt += "\n---\n\n";
        break;

      case "raw":
        txt += b.html + "\n\n";
        break;

      default:
        if (b.html) {
          console.log("Raw html block", blk.type);
          txt += "\n" + b.html + "\n";
        }

        console.log("Unknown block", b, blk.type);
    }
  });
  return txt;
}

export function convertJson(jsn) {
  let meta = jsn.meta;
  if (!meta) {
    console.log(jsn);
  }
  meta.date && (meta.date = meta.date.replace(/\//g, "."));
  let content;
  if (jsn.content_format !== "blocks") {
    console.log("Ancient content format:", jsn.content_format);
    console.log(jsn.content);
    content = jsn.content;
  } else {
    content = convertBlocks(jsn.content.blocks);
  }
  return `---
${dump(meta)}---
${content}
`;
}
