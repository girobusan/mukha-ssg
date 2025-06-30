const chokidar = require("chokidar");
const throttle = require("lodash.throttle");

export function startWatcher(what, fn) {
  return chokidar.watch(what, { awaitWriteFinish: true, atomic: 200 }).on(
    "all",
    throttle(
      (event, path) => {
        console.log(`Изменение: ${event} в ${path}`);
        fn();
      },
      1000,
      { trailing: true },
    ),
  );
}
