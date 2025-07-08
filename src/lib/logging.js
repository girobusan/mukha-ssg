import log from "loglevel";
const prefix = require("loglevel-plugin-prefix");
import colors from "yoctocolors";

function tb(txt, l = 5) {
  let add = l - txt.length;
  return txt + "       ".substring(0, add);
}

const colormap = {
  TRACE: colors.magenta,
  DEBUG: colors.cyan,
  INFO: colors.blue,
  WARN: colors.yellow,
  ERROR: colors.red,
};
const loggers = [];

prefix.reg(log);
prefix.apply(log, {
  // template: "%l (%n)",
  format(level, name, _) {
    return `${colormap[level.toUpperCase()](tb(level))} ${colors.dim(`${name}:`)}`;
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
