const http = require("node:http");
const url = require("node:url");
var spawn = require("child_process").spawn;
import { SimpleWebSocketServer as SWSS } from "./SimpleWebSocketServer";
const fs = require("node:fs");
const path = require("node:path");
const yaml = require("js-yaml");
import open from "open";
import { mimeTypes } from "./mimes";
import { createMemoryRenderer } from "./memory_render";
import { startWatcher } from "./watcher";
import { delFile, newPage, newDir } from "./fileops";
import { getLogger } from "../../lib/logging";
import { absPath } from "../../lib/util";
import { injectWS } from "./injects";
var log = getLogger("devserver");

const basePath = "";
const watchPaths = ["config", "assets", "src", "data"];
//
function safePath(baseDir, requestedPath, absolute = true) {
  const absoluteRequested = path.resolve(baseDir, requestedPath);
  const absoluteBase = path.resolve(baseDir);

  if (!absoluteRequested.startsWith(absoluteBase)) {
    return null; // !!!
  }
  return absolute ? absoluteRequested : requestedPath; //
}

function createServer(port, in_dir, out_dir, config, cleanup) {
  var myPort = port; //await getFreePort(port);
  const memoryRenderer = createMemoryRenderer(in_dir, out_dir, cleanup);
  const watcher = startWatcher(
    watchPaths.map((p) => path.join(in_dir, p)),
    memoryRenderer.run,
  );

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

    res.writeHead(200, { "Content-Type": contentType });

    if (fileObj.type === "copy") {
      const readStream = fs.createReadStream(fileObj.src);
      readStream.on("error", (err) => {
        log.error(`Error streaming file ${fileObj.src}:`, err);
        if (!res.headersSent) {
          res.writeHead(500);
          res.end("Internal Server Error");
        }
      });
      readStream.pipe(res);
    } else {
      res.end(
        extname === ".html"
          ? injectWS(
              fileObj.content,
              myPort,
              config.edit_cmd ? fileObj.page.file.src : false,
              config.edit_cmd ? fileObj.page.file.path : false,
            )
          : fileObj.content,
      );
    }
  });

  const wss = new SWSS(server);
  wss.on("message", (m) => {
    let mj;
    try {
      mj = JSON.parse(m);
    } catch (e) {
      log.warn("Invalid JSON from WebSocket:", m);
      return;
    }
    let action = mj.action;
    const spawnEditor = (...args) => {
      let cmd = config.edit_cmd.split(/\s+/);
      spawn(cmd.shift(), [...cmd, ...args], {
        detached: true,
        shell: false,
      }).unref();
      return;
    };
    //
    if (action === "edit") {
      return spawnEditor(absPath(mj.page));
    }
    if (action === "del") {
      delFile(mj.page, in_dir);
      memoryRenderer.clear(mj.path);
      wss.broadcast("reload");
      return;
    }
    if (action === "dir") {
      let nd = newDir(mj.near, mj.fname);

      log.info("Creating new dir", nd);
      return spawnEditor(nd);
    }
    if (action === "new") {
      let nf = newPage(mj.near, mj.fname);

      log.info("Creating new page", nf);
      return spawnEditor(nf);
    }
    log.warn("Unknown request from page:", m);
  });

  memoryRenderer.on("end", () => {
    log.info("Reloading...");
    wss && wss.broadcast("reload");
  });
  memoryRenderer.on("error", () => {
    log.error("Error rebuilding, see browser.");
    wss && wss.broadcast("reload");
  });

  const runServer = () => {
    log.debug("Starting server...");
    server.listen(myPort, () => {
      myPort = server.address().port;
      log.info(`Server running at http://localhost:${server.address().port}`);
      open("http://localhost:" + myPort).catch((err) =>
        log.warn("Can not open browser:", err),
      );
    });
  };
  const closeServer = () => {
    log.info("Stopping server...");
    watcher.close().then(() => console.log("Watch stopped."));
    wss.close();
    server.close(() => {
      log.info("Server stopped.");
      memoryRenderer.write();
      process.exit(0);
    });
    server.closeAllConnections();
    //
    //
    // setTimeout(() => {
    //   log.warn("Forcing server to quit...");
    //   process.exit(1);
    // }, 3000);
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

export function backend({ in_dir, out_dir, port, cleanup, config }) {
  let server = createServer(port, in_dir, out_dir, config, cleanup);
  return server;
}
