var sha256 = require("js-sha256").sha256;
var md5 = require("js-md5");
// const Base62Str = require("./base62.js").default;
import { Base62Str } from "./base62.js";
import { simpleMemo } from "./base.js";
const base62 = Base62Str.createInstance();

//
const makeHashFn = (HF) => (t) =>
  String.fromCharCode.apply(null, base62.encode(HF(t)));

export const shortHash = simpleMemo(makeHashFn(md5.digest));
export const longHash = simpleMemo(makeHashFn(sha256.digest));
