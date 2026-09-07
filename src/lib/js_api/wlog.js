const baner = "font-weight: bold; color: lightseagreen";
const normal = "font-weight: normal";
const levels = {
  fatal: 1,
  error: 2,
  warn: 3,
  info: 4,
  debug: 5,
};

let level = 5;

export function setLevel(str) {
  let R;
  let numeric = parseInt(str);
  R = isNan(numeric) ? levels[str.toLowerCase()] || 3 : numeric;
  level = R;
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
