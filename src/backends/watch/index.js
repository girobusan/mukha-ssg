const http = require("node:http");
const url = require("node:url");
const WebSocket = require("ws");
const fs = require("node:fs");
const path = require("node:path");
const yaml = require("js-yaml");
import open from "open";
import { mimeTypes } from "./mimes";
import { createMemoryRenderer } from "./memory_render";
import { startWatcher } from "./watcher";

const basePath = "";
const watchPaths = ["config", "assets", "src", "data"];

function injectWS(html, port) {
  const code = `<script>
 const ws = new WebSocket("ws://localhost:${port}");
 ws.onmessage = function(event) {
    console.log("Message:", event.data);
    if(event.data==='reload') location.reload();
    if(event.data!=='reload') document.body.innerHTML=event.data;
   };
 </script></body>`;

  let r = html.replace("</body>", code);
  return r;
}

function createServer(port, in_dir, timed, config) {
  const memoryRenderer = createMemoryRenderer(in_dir, config);
  const watcher = startWatcher(
    watchPaths.map((p) => path.join(in_dir, p)),
    memoryRenderer.run,
  );
  memoryRenderer.onEnd(() => {
    console.log("Reloading...");
    broadcast("reload");
  });
  memoryRenderer.onError((err) => {
    console.log(err);
    broadcast(err.toString());
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
        extname === ".html" ? injectWS(fileObj.content, port) : fileObj.content,
      );
    }
  });

  const wss = new WebSocket.Server({ server });
  const clients = new Set();
  wss.on("connection", (ws) => {
    console.log("New WS client!");

    clients.add(ws);

    ws.on("close", () => {
      clients.delete(ws);
      console.log("WS client disconnected.");
    });

    ws.on("error", (err) => {
      console.error("WebSocket error:", err);
    });
  });
  function broadcast(message) {
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  const runServer = () => {
    console.log("run server");
    server.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
      open("http://localhost:" + port).catch((err) =>
        console.log("Can not open browser", err),
      );
    });
  };
  const closeServer = () => {
    console.log("\nStopping server...");
    watcher.close().then(() => console.log("Watch stopped."));
    clients.forEach((ws) => ws.close());
    wss.close();
    server.close(() => {
      console.log("Server stopped.");
      process.exit(0);
    });
    //
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
