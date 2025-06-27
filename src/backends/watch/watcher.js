const chokidar = require("chokidar");
const throttle = require("lodash.throttle");

const watchFolder = "./test-folder";

chokidar.watch(watchFolder).on(
  "all",
  throttle((event, path) => {
    console.log(`Изменение: ${event} в ${path}`);
  }, 1000),
);
