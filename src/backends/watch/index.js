const http = require("node:http");
const url = require("node:url");
import { SimpleWebSocketServer as SWSS } from "./SimpleWebSocketServer";
const fs = require("node:fs");
const path = require("node:path");
const yaml = require("js-yaml");
import open from "open";
import { mimeTypes } from "./mimes";
import { createMemoryRenderer } from "./memory_render";
import { startWatcher } from "./watcher";
import { getLogger } from "../../lib/logging";
var log = getLogger("server");

const basePath = "";
const watchPaths = ["config", "assets", "src", "data"];

function getFreePort(startPort = 3000) {
  return new Promise((resolve) => {
    function checkPort(port) {
      const server = net
        .createServer()
        .once("error", () => checkPort(port + 1))
        .once("listening", () => {
          server.close();
          resolve(port);
        })
        .listen(port);
    }
    checkPort(startPort);
  });
}

function injectWS(html, port, file_src) {
  const code = `<script>
 const src="${file_src || ""}"
 const ws = new WebSocket("ws://localhost:${port}");
 ws.onmessage = function(event) {
    console.log("Message:", event.data);
    if(event.data==='reload') { location.reload(); }
       else{ alert( event.data );}
   };
 </script></body>`;

  let r = html.replace("</body>", code);
  return r;
}

function createServer(port, in_dir, config) {
  const memoryRenderer = createMemoryRenderer(in_dir, config);
  const watcher = startWatcher(
    watchPaths.map((p) => path.join(in_dir, p)),
    memoryRenderer.run,
  );
  memoryRenderer.on("end", () => {
    log.info("Reloading...");
    wss.broadcast("reload");
  });
  memoryRenderer.on("error", () => {
    log.error("Error rebuilding, see browser.");
    wss.broadcast("reload");
  });

  //
  const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const requestedPath = parsedUrl.pathname;

    let filePath = decodeURIComponent(requestedPath).substring(basePath.length);
    // console.log("File path is", filePath);

    let fileObj = memoryRenderer.get(filePath);
    // first — if it is an urgent message
    if (fileObj && fileObj.message) {
      res.writeHead(200, { "Content-Type": "text/html;charset=utf-8" });
      res.end(injectWS(fileObj.content, port));
      return;
    }

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
      res.end(
        extname === ".html"
          ? injectWS(fileObj.content, port, fileObj.page.file.src)
          : fileObj.content,
      );
    }
  });

  const wss = new SWSS(server);

  const runServer = () => {
    log.debug("Starting server...");
    server.listen(port, () => {
      log.info(`Server running at http://localhost:${port}`);
      open("http://localhost:" + port).catch((err) =>
        log.warn("Can not open browser:", err),
      );
    });
  };
  const closeServer = () => {
    log.info("Stopping server...");
    watcher.close().then(() => console.log("Watch stopped."));
    // clients.forEach((ws) => ws.close());
    wss.close();
    server.close(() => {
      log.info("Server stopped.");
      process.exit(0);
    });
    //
    setTimeout(() => {
      log.warn("Forcing server to quit...");
      process.exit(1);
    }, 3000);
  };
  //
  process.on("SIGINT", closeServer); // Ctrl+C
  process.on("SIGTERM", closeServer); // kill
  process.on("exit", () => {
    log.info("Exiting...");
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
    log.error("Can not load or parse config.", e.message);
    process.exit(1);
  }
  if (timed) {
    Config.timed = timed;
  }
  let server = createServer(port, in_dir, Config);
  return server;
}
