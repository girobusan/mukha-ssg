export function wrapForWeb(code, name) {
  return `
(function() {
  let module = {};
  function require(what){
      return window.Mukha.require(what , "${name}")
    };
  let mrequire = require;
  ${code}
  window.Mukha.registerModule("${name}" , module.exports)
})()
`;
}

export function wrapModuleFn(code, name) {
  return `(function(){

let modFn = ()=>{
  let module = {};
  function require(what){
      return window.Mukha.require(what , "${name}")
    };
  let mrequire = require;
  ${code}
  window.Mukha.registerModule("${name}" , module.exports)
}

window.Mukha.registerModuleFn( "${name}" , modFn)

})()`;
}
