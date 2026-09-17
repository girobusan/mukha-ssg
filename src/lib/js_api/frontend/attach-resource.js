import { relative, resolveAbsPath } from "./web-path-ops";
import { wlog } from "./wlog";
const attached = new Set();

//
export function attachResource(url, tagName, currentLocation) {
  let tg = tagName || "script";
  wlog.debug("Attaching:", url, "as", tg);
  let relp;
  let absp;
  // is local?
  if (url.startsWith("/")) {
    absp = url;
    relp = relative(currentLocation, absp);
  }
  // is relative?
  else if (url.startsWith(".")) {
    relp = url;
    absp = resolveAbsPath(currentLocation, relp);
  }
  // it's not local at all
  else if (url.match(/^(https:|http:|ftp:|ssh:)/)) {
    relp = url;
    absp = url;
    // assuming relative!
  } else {
    relp = url;
    absp = resolveAbsPath(currentLocation, relp);
  }

  if (attached.has(absp)) {
    wlog.debug("Already attached.");
    return Promise.resolve(true);
  }
  attached.add(absp);

  const tag = tg === "script" ? "script" : "link";
  const attr = tg === "script" ? "src" : "href";
  const rel = tg === "script" ? false : "stylesheet";
  return new Promise((res, rej) => {
    let st = document.createElement(tag);
    rel && st.setAttribute("rel", rel);
    if ("onload" in st) {
      st.addEventListener("load", () => res("LOADED"));
      st.addEventListener("error", () => rej("NOT LOADED"));
    } else {
      res(true);
    }
    document.head.appendChild(st);
    st.setAttribute(attr, relp);
  });
}
