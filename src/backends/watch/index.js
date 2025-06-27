const http = require("node:http");
const url = require("node:url");
const fs = require("node:fs");
const path = require("node:path");
import { mimeTypes } from "./mimes";
var PORT = 3000;
var IN_DIR;
var OUT_DIR;

const server = http.createServer((req, res) => {
  // Парсим URL и получаем путь
  const parsedUrl = url.parse(req.url, true);
  const requestedPath = parsedUrl.pathname;

  // Выводим в консоль запрошеный путь
  console.log(`Запрошен путь: ${requestedPath}`);

  let filePath = path.join("PUBLIC_DIR", decodeURIComponent(requestedPath));

  // Если это папка или запрос без слэша — проверяем index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }
  const extname = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[extname] || "application/octet-stream";

  // Проверяем, существует ли файл
  let exists = fs.existsSync(filePath);

  if (!exists) {
    res.writeHead(404, { "Content-Type": "text/plain;charset=utf-8" });
    res.end("404 Not Found");
    return;
  }

  // Отправляем заголовки
  res.writeHead(200, { "Content-Type": contentType });

  // Читаем файл и отправляем его клиенту
  const readStream = fs.createReadStream(filePath);
  readStream.pipe(res);
});

const runServer = () => {
  server.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
  });
};
const closeServer = () => {
  console.log("\nЗавершаем работу сервера...");
  server.close(() => {
    console.log("HTTP-сервер остановлен.");
    process.exit(0);
  });

  // На случай, если сервер не отвечает — принудительный выход через таймаут
  setTimeout(() => {
    console.log("Принудительное завершение работы.");
    process.exit(1);
  }, 3000);
};
//
process.on("SIGINT", closeServer); // Ctrl+C
process.on("SIGTERM", closeServer); // kill
process.on("exit", () => {
  console.log("Процесс Node.js завершён.");
});

export function backend({ in_dir, out_dir, port }) {
  PORT = port || 3000;
  IN_DIR = in_dir;
  OUT_DIR = out_dir;
  return {
    run: runServer,
  };
}
