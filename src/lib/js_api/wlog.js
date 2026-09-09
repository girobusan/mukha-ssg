const baner = "font-weight: bold; color: lightseagreen";
const normal = "font-weight: normal";
const levels = {
  fatal: 1,
  error: 2,
  warn: 3,
  info: 4,
  debug: 5,
};
const levelsTxt = Object.keys(levels);

let level = 5;

export function setLevel(L) {
  let R;
  let isStr = typeof L === "string" || L instanceof String;
  R = !isStr ? L : levels[L.toLowerCase()] || 4;
  level = R;
  wlog.info("Loggingh level is set to", R, `(${levelsTxt[R - 1]})`);
}

export const wlog = {
  fatal: (...args) => console.error(...args),
  error: (...args) => level >= 2 && console.error(...args),
  warn: (...args) => level >= 3 && console.warn(...args),
  info: (...args) => level >= 4 && console.info(...args),
  log: (...args) => level >= 4 && console.log(...args),
  debug: (...args) => level >= 5 && console.log(": ", ...args),
};

export const banertype = (...args) => {
  const ar = args.join(" ");
  console.log("%c" + ar + "%c", baner, normal);
};
