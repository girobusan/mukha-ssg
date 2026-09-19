const acorn = require("acorn");
const walk = require("acorn-walk");
const path = require("path-browserify");

export function findRequires(code) {
  // 1. Парсим код в AST
  const ast = acorn.parse(code, { ecmaVersion: 2020, sourceType: "script" });

  const requires = [];

  // 2. Обходим дерево и ищем вызовы require
  walk.simple(ast, {
    CallExpression(node) {
      // Проверяем, что это вызов require и аргумент - строка
      if (
        node.callee.name === "require" &&
        node.arguments.length > 0 &&
        node.arguments[0].type === "Literal"
      ) {
        requires.push(node.arguments[0].value);
      }
    },
  });

  return requires; // ['fs', 'path', 'http', './my-module', 'express']
}

export function normalizeName(n, from) {
  let r = path.normalize(n); // it's always path
  return r;
}
