import log from "loglevel";
const prefix = require("loglevel-plugin-prefix");
import colors from "yoctocolors";
import { supportEmoji } from "./terminal_emojii_support";

const colormap = {
  TRACE: colors.magenta,
  DEBUG: colors.cyan,
  INFO: colors.blueBright,
  WARN: colors.yellow,
  ERROR: colors.red,
};

const symbolmap = {
  TRACE: " ≈ ",
  DEBUG: " ~ ",
  INFO: " i ",
  WARN: " ! ",
  ERROR: "!!!",
};

const emojimap = {
  TRACE: "🔎",
  DEBUG: "🔧",
  INFO: "💬",
  WARN: "❗",
  ERROR: "💢",
};
var mapping = symbolmap;
const SE = supportEmoji();
if (SE) {
  mapping = emojimap;
}
const loggers = [];

prefix.reg(log);
prefix.apply(log, {
  // template: "%l (%n)",
  format(level, name, _) {
    return `${colors.bold(colormap[level](mapping[level]))} ${colors.dim(`${name}:`)}`;
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
