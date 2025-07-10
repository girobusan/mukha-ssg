const chokidar = require("chokidar");
const throttle = require("lodash.throttle");
import { getLogger } from "../../lib/logging";
var log = getLogger("watch");

export function startWatcher(what, fn) {
  return chokidar
    .watch(what, { awaitWriteFinish: true, atomic: 200, ignoreInitial: true })
    .on(
      "all",
      throttle(
        (event, path) => {
          log.debug(`Change: ${event} at ${path}`);
          fn();
        },
        500,
        { trailing: true },
      ),
    );
}
