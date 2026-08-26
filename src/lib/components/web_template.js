(function(factory, filename) {
  // Браузер: складываем в пространство имён
  let module = {};
  factory();
  window.modules[filename] = module.exports;
  //
})(function() {
  //module content start

  function Button(props) {
    //...code...
  }

  module.exports = { Button };
  //module content end
});

function prep(name) {
  let module = {};
  let require = winodw.myRequire;
  //...

  // module code as is

  window.modules[name] = module.exports;
}
