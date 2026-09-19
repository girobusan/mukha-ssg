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

window.Mukha._pocb( "${name}" , modFn)

})()`;
}
