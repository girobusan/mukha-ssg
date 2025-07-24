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
import { delFile, newPage } from "./fileops";
import { getLogger } from "../../lib/logging";
var log = getLogger("devserver");

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
const btnStyle = `all:unset;
font-family: system-ui, sans-serif;
border: 1px solid gray;
background: white;
color: black;
border-radius: 4px;
padding:2px 6px;
font-size: 14px;
user-select:none;
cursor:pointer;
margin-right: 8px;
`.replace(/\n/g, "");

function injectWS(html, port, file_src, page_path) {
  const helperCode = `
const ppath="${page_path}"
const cont = document.createElement("div");
const btnE = document.createElement("button");
const btnD = document.createElement("button");
const btnN = document.createElement("button");
btnE.innerHTML="edit"
btnD.innerHTML="del"
btnN.innerHTML="new"
//
btnE.setAttribute("style" , "${btnStyle}");
btnD.setAttribute("style" , "${btnStyle}");
btnN.setAttribute("style" , "${btnStyle}");
cont.setAttribute("style" , "position:absolute;position: fixed; bottom: 8px ; right: 0px;" + 
"z-index:10000;background-color: transparent;")

cont.appendChild(btnE);
cont.appendChild(btnD);
cont.appendChild(btnN);
document.body.appendChild(cont);
btnE.addEventListener("click" , ()=>ws.send(JSON.stringify({action:'edit', page: src}))  )
btnD.addEventListener("click" , 
  ()=>{ if(confirm('Are you sure?')){
      ws.send(JSON.stringify({action:'del', page: src , path: ppath})); 
      history.go(-1);
}})
btnN.addEventListener("click" ,
  ()=>{console.log("new")
      let fnm = prompt("Enter filename without extension:");
      if(!fnm) return;
      ws.send(JSON.stringify({action:'new', near: src , fname: fnm})); 
})
`;
  const code = `<script>
 const src="${file_src || ""}"
 const ws = new WebSocket("ws://localhost:${port}");
 ws.onmessage = function(event) {
    console.log("Message:", event.data);
    if(event.data==='reload') { location.reload(); }
       else{ alert( event.data );}
   };
 ${file_src ? helperCode : ""}
 </script></body></html>`;

  let r = html.replace(/<\/body\>[\s\n]*<\/html\>[\s\n]*$/i, code);
  return r;
}

function createServer(port, in_dir, out_dir, config) {
  const memoryRenderer = createMemoryRenderer(in_dir, out_dir);
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

    res.writeHead(200, { "Content-Type": contentType });

    if (fileObj.type === "copy") {
      const readStream = fs.createReadStream(fileObj.src);
      readStream.pipe(res);
    } else {
      res.end(
        extname === ".html"
          ? injectWS(
            fileObj.content,
            port,
            config.edit_cmd ? fileObj.page.file.src : false,
            config.edit_cmd ? fileObj.page.file.path : false,
          )
          : fileObj.content,
      );
    }
  });

  const wss = new SWSS(server);
  wss.on("message", (m) => {
    let mj = JSON.parse(m);
    let action = mj.action;
    if (action === "edit") {
      spawn(config.edit_cmd, [mj.page], { detached: true }).unref();
      return;
    }
    if (action === "del") {
      delFile(mj.page, in_dir);
      memoryRenderer.clear(mj.path);
      wss.broadcast("reload");
      return;
    }
    if (action === "new") {
      let nf = newPage(mj.near, mj.fname);

      log.info("Creating new page", nf);
      spawn(config.edit_cmd, [nf], { detached: true }).unref();
      return;
    }
    log.warn("Unknown request from page:", m);
  });

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
  let server = createServer(port, in_dir, out_dir, Config);
  return server;
}
