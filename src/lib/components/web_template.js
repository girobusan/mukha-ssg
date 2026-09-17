// export function wrapForWeb(code, name) {
//   return `
// (function() {
//   let module = {};
//   function require(what){
//       return window.Mukha.require(what , "${name}")
//     };
//   let mrequire = require;
//   ${code}
//   window.Mukha.registerModule("${name}" , module.exports)
// })()
// `;
// }

export function wrapModuleFn(code, name) {
  return `(function(){

let modFn = (regFn , req)=>{
  let module = {};
  function require(what){
      return req(what , "${name}")
    };
  let mrequire = require;
  ${code}
  regFn("${name}" , module.exports)
}

window.Mukha._rmc( "${name}" , modFn)

})()`;
}
