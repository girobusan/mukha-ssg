export function wrapForWeb(code, name) {
  return `
(function() {
  let module = {};
  let require = (what)=>window.Mukha.require(what , "${name}");
  let mrequire = require;

  ${code}

// remove later:
  window.modules["${name}"] = module.exports;
  window.Mukha.registerModule("${name}" , module.exports)
})()
`;
}
