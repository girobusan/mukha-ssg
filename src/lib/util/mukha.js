const path = require("node:path");
export function makePageLikeObj(meta, content, path, html, prehtml) {
  return {
    meta: meta,
    content: content,
    permalink: path,
    html: html || "",
    // prehtml: prehtml || "",
    file: {
      getContent: () => content,
      path: path,
    },
  };
}

export function cloneFile(f) {
  let clone = Object.assign({}, f);
  clone.meta = Object.assign({}, f.meta);
  clone.file = Object.assign({}, f.file);
  return clone;
}

export function checkSafeEditor(str) {
  const cmdParts = str.split(/\s+/);
  const command = cmdParts[0]; // binary?
  const flags = cmdParts.slice(1); // flags?
  const knownEditors = new Set([
    "nano",
    "vim",
    "vi",
    "emacs",
    "gedit",
    "code",
    "subl",
    "atom",
    "micro",
    "nvim",
    "zed",
    "mcedit",
  ]);
  const forbiddenPatterns = /[;&|`$><()]|\.\./;
  const forbiddenCommands = new Set([
    "rm",
    "dd",
    "mkfs",
    "shred",
    "kill",
    "pkill",
    "chmod",
    "chown",
    "wget",
    "curl",
    "nc",
    "telnet",
    "eval",
    "exec",
    "source",
    "alias",
  ]);

  for (const flag of flags) {
    if (forbiddenPatterns.test(flag)) {
      return [false, "Forbidden pattern: " + flag];
    }
  }

  if (forbiddenCommands.has(path.basename(command).trim().toLowerCase())) {
    return [false, "Forbidden command: " + command];
  }

  if (knownEditors.has(path.basename(command))) {
    return [true, "+1 for " + path.basename(command) + " as editor!"];
  }

  return [true, "You editor is " + command];
}

export function sanitizeFileName(str) {
  let fileName = str.trim();

  fileName = fileName.replace(/\s+/g, "_");

  fileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "");

  fileName = fileName.replace(/_+/g, "_");

  fileName = fileName.replace(/^_+|_+$/g, "");

  if (fileName.length === 0) {
    return "file_" + Math.round(Math.random() * 100000);
  }

  return fileName;
}
