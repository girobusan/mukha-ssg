const http = require("node:http");
const url = require("node:url");
const fs = require("node:fs");
const path = require("node:path");
const yaml = require("js-yaml");
import open from "open";
import { mimeTypes } from "./mimes";
import { createMemoryRenderer } from "./memory_render";
import { startWatcher } from "./watcher";

const basePath = "";

function createServer(port, in_dir, timed, config) {
  const memoryRenderer = createMemoryRenderer(in_dir, config);
  const watcher = startWatcher(in_dir, memoryRenderer.run);
  //
  const server = http.createServer((req, res) => {
    // Парсим URL и получаем путь
    const parsedUrl = url.parse(req.url, true);
    const requestedPath = parsedUrl.pathname;

    // Выводим в консоль запрошеный путь
    console.log(`Запрошен путь: ${requestedPath}`);

    let filePath = decodeURIComponent(requestedPath).substring(basePath.length);
    // console.log("File path is", filePath);

    let fileObj = memoryRenderer.get(filePath);

    if (!fileObj) {
      let testIndex = memoryRenderer.get(
        path.posix.join(filePath, "index.html"),
      );
      if (testIndex) fileObj = testIndex;
    }

    if (!fileObj) {
      res.writeHead(404, { "Content-Type": "text/plain;charset=utf-8" });
      res.end("404 Not Found");
      return;
    }

    const extname = path.extname(fileObj.path).toLowerCase();
    const contentType = mimeTypes[extname] || "application/octet-stream";

    // Отправляем заголовки
    res.writeHead(200, { "Content-Type": contentType });

    // Читаем файл и отправляем его клиенту

    if (fileObj.type === "copy") {
      const readStream = fs.createReadStream(fileObj.src);
      readStream.pipe(res);
    } else {
      res.end(fileObj.content);
    }
  });

  const runServer = () => {
    console.log("run server");
    server.listen(port, () => {
      console.log(`Сервер запущен на http://localhost:${port}`);
      console.log(open);
      open("http://localhost:" + port).catch((err) =>
        console.log("Can not open browser", err),
      );
    });
  };
  const closeServer = () => {
    console.log("\nStopping server...");
    server.close(() => {
      console.log("Server stopped.");
      process.exit(0);
    });
    // На случай, если сервер не отвечает — принудительный выход через таймаут
    setTimeout(() => {
      console.log("Forcing server to quit...");
      process.exit(1);
    }, 3000);
  };
  //
  process.on("SIGINT", closeServer); // Ctrl+C
  process.on("SIGTERM", closeServer); // kill
  process.on("exit", () => {
    console.log("Server stopped, exiting...");
  });
  //
  return {
    run: runServer,
    close: closeServer,
  };
}

export function backend({ in_dir, out_dir, timed, port }) {
  let Config;
  try {
    Config = yaml.load(
      fs.readFileSync(path.join(in_dir, "config", "site.yaml"), {
        encoding: "utf8",
      }),
    );
  } catch (e) {
    console.log("Can not load or parse config.", e.message);
    process.exit(1);
  }
  if (timed) {
    Config.timed = timed;
  }
  let server = createServer(port || 3000, in_dir, false, Config);
  return server;
}
