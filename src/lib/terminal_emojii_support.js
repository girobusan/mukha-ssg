import process from "node:process";
//
var hasUnicode = function () {
  var isUTF8 = /UTF-?8$/i;
  var ctype = process.env.LC_ALL || process.env.LC_CTYPE || process.env.LANG;
  return isUTF8.test(ctype);
};

function thisWinHasUTF() {
  // from
  // @sindresorhus/is-unicode-supported
  const { env } = process;
  const { TERM, TERM_PROGRAM } = env;
  return (
    Boolean(env.WT_SESSION) || // Windows Terminal
    Boolean(env.TERMINUS_SUBLIME) || // Terminus (<0.2.27)
    env.ConEmuTask === "{cmd::Cmder}" || // ConEmu and cmder
    TERM_PROGRAM === "Terminus-Sublime" ||
    TERM_PROGRAM === "vscode" ||
    TERM === "xterm-256color" ||
    TERM === "alacritty" ||
    TERM === "rxvt-unicode" ||
    TERM === "rxvt-unicode-256color" ||
    env.TERMINAL_EMULATOR === "JetBrains-JediTerm"
  );
}

export function supportEmoji() {
  if (process.platform === "win32") {
    return thisWinHasUTF();
  }

  return hasUnicode();
}
