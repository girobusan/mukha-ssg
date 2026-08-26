export function wrapForWeb(code, name) {
  return `
(function() {
  let module = {};
  let require = window.myRequire;
  let mrequire = require;

  ${code}

  window.modules[${name}] = module.exports;
  // call register function?
})()
`;
}
