// single tag
// {{ component Name prop1=2, prop2=3 }}
//
// double tag
// {% component Name pop=1 %}
// ...
// {% endcomponent %}
//
//
//
export function componentSingle(...args) {
  args.forEach((a) => console.log("Single tag", a));
}

export function componentTag() {
  this.tags = ["component"];
  this.parse = function(parser, nodes) {
    var tok = parser.nextToken();
    //
    const args = parser.parseSignature(null, true);
    parser.advanceAfterBlockEnd(tok.value);
    //
    const body = parser.parseUntilBlocks("component", "endcomponent");
    parser.advanceAfterBlockEnd();

    // Actually do work on block body and arguments
    return new nodes.CallExtension(this, "run", args, [body]);
    //
  };
  this.run = function(...args) {
    // context , ...args , body
    args.forEach((a) => console.log(a));
  };
}
