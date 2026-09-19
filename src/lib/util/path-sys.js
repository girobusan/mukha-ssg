const path = require("path");
const crypto = require("crypto");

//
// Utility functions
// for path and file operations
// under node. Uses OS-specific paths.
//
//

/**
 *  returns absolute path
 *  @param {String} p  valid path
 *  @returns {String}  absolute path
 */
export function absPath(p) {
  return path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
}

// check and save
//const fs = require('fs');

/**
 * Записывает файл только если его содержимое отличается от переданного
 * При любой ошибке или невозможности сравнить - перезаписывает
 */
export function writeFileIfChanged(
  content,
  filePath,
  options = {},
  log = console.log,
) {
  const encoding = options.encoding || "utf8";

  // Пытаемся нормализовать содержимое в буфер
  let newContentBuffer;
  try {
    if (Buffer.isBuffer(content)) {
      newContentBuffer = content;
    } else if (typeof content === "string") {
      newContentBuffer = Buffer.from(content, encoding);
    } else {
      newContentBuffer = Buffer.from(content);
    }
  } catch (err) {
    // Не удалось преобразовать - перезаписываем
    fs.writeFileSync(filePath, content);
    return true;
  }

  try {
    const stats = fs.statSync(filePath);

    // Проверяем размер
    if (stats.size !== newContentBuffer.length) {
      fs.writeFileSync(filePath, newContentBuffer);
      return true;
    }

    // Читаем существующий файл
    const existingContent = fs.readFileSync(filePath);

    // Если это не буфер - перезаписываем
    if (!Buffer.isBuffer(existingContent)) {
      fs.writeFileSync(filePath, newContentBuffer);
      return true;
    }

    // Пытаемся сравнить
    let isEqual = false;
    try {
      if (crypto.timingSafeEqual) {
        isEqual = crypto.timingSafeEqual(existingContent, newContentBuffer);
      } else {
        isEqual =
          existingContent.toString(encoding) ===
          newContentBuffer.toString(encoding);
      }
    } catch (err) {
      // Ошибка при сравнении - перезаписываем
      fs.writeFileSync(filePath, newContentBuffer);
      return true;
    }

    // Если не равны - перезаписываем
    if (!isEqual) {
      fs.writeFileSync(filePath, newContentBuffer);
      return true;
    }

    // Содержимое одинаковое
    log("Not changed:", filePath);
    return false;
  } catch (err) {
    // Любая ошибка при работе с файлом - перезаписываем
    fs.writeFileSync(filePath, newContentBuffer);
    return true;
  }
}
