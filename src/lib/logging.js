import log from "loglevel";
const prefix = require("loglevel-plugin-prefix");
import colors from "yoctocolors";
import { supportEmoji } from "./terminal_emojii_support";

let BW = false;
export function setBW(v) {
  BW = v;
  if (v) {
    mapping = symbolmap;
    colormapping = bwmap;
  }
}

const colormap = {
  TRACE: colors.magenta,
  DEBUG: colors.cyan,
  INFO: colors.blueBright,
  WARN: colors.yellow,
  ERROR: colors.red,
};

const bwmap = {
  TRACE: (a) => a,
  DEBUG: (a) => a,
  INFO: (a) => a,
  WARN: (a) => a,
  ERROR: (a) => a,
};

const symbolmap = {
  TRACE: " ≈ ",
  DEBUG: " : ",
  INFO: " · ",
  WARN: " ! ",
  ERROR: "!!!",
};

const emojimap = {
  TRACE: "🔎",
  DEBUG: "🔧",
  INFO: "🔹",
  WARN: "❗",
  ERROR: "💢",
};

var mapping = symbolmap;
var colormapping = colormap;
const SE = supportEmoji();
if (SE && !BW) {
  mapping = emojimap;
}
const loggers = [];

prefix.reg(log);
prefix.apply(log, {
  // template: "%l (%n)",
  format(level, name, _) {
    return `${colormapping[level](mapping[level])} ${BW ? name + ": " : colors.dim(`${name}:`)}`;
  },
});
//log.enableAll();

export function getLogger(name) {
  let l = log.getLogger(name);
  loggers.push(l);
  return l;
}

export function setLevel(lvl) {
  // log.warn("Log level is set to", lvl);
  log.setLevel(lvl, true);
  loggers.forEach((l) => l.setLevel(lvl));
}
