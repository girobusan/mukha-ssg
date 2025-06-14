import { dump } from "js-yaml";
import { fitToWidth } from "../lib/util.js";
console.log(fitToWidth("Fit to width"));

function boolList(list, obj) {
  return list.filter((e) => obj[e]);
}

function unBR(txt) {
  return txt.replace(/<br\/?>\s*$/, "");
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
      ? `[![${caption}](${url})](${link})${caption}`
      : `![${caption}](${url})${caption}`;
    return `
<!--@image-->
${imgtag}

${fence}
${dump({ caption, url, link, classes })}
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
        txt += "#######".substring(0, +b.level) + " " + unBR(b.text) + "\n\n";
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
          txt += helpers.attachment(b.url, b.title || b.filename, b.class);
        } else {
          txt += "\n\n" + `<!--attached: ${b.url}-->` + "\n\n";
        }
        break;
      case "image":
        const classes = boolList(
          ["left", "right", "stretched", "noresize", "border"],
          b,
        );

        txt += helpers.image(b.caption, b.file.url, b.link, classes);
        break;

      default:
        if (b.html) {
          console.log("Raw html block");
          txt += "\n" + b.html + "\n";
          break;
        }
        console.log("Unknown block", b);
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
