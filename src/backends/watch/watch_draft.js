// server.js

const http = require("node:http");
const url = require("node:url");
const fs = require("node:fs");
const path = require("node:path");

// Папка, из которой будем раздавать файлы
const PUBLIC_DIR = path.resolve(__dirname, "public");

// Простая мапа расширений в MIME-типы
const mimeTypes = {
  ".html": "text/html",
  ".htm": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".txt": "text/plain",
};

// Создаем HTTP-сервер
const server = http.createServer((req, res) => {
  // Парсим URL и получаем путь
  const parsedUrl = url.parse(req.url, true);
  const requestedPath = parsedUrl.pathname;

  // Выводим путь в консоль
  console.log(`Запрошен путь: ${requestedPath}`);

  // Формируем путь к файлу
  let filePath = path.join(PUBLIC_DIR, decodeURIComponent(requestedPath));

  // Если это папка или запрос без слэша — проверяем index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  // Получаем расширение файла
  const extname = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[extname] || "application/octet-stream";

  // Проверяем, существует ли файл
  fs.exists(filePath, (exists) => {
    if (!exists) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404 Not Found");
      return;
    }

    // Отправляем заголовки
    res.writeHead(200, { "Content-Type": contentType });

    // Читаем файл и отправляем его клиенту
    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  });
});

// Сервер будет слушать на порту 3000
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
  console.log(`Ищет файлы в папке: ${PUBLIC_DIR}`);
});
