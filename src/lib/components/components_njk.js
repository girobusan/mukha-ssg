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
  this.tags = ["component", "componentWrap"];
  this.parse = function (parser, nodes) {
    // console.log(parser.tokens[0]);
    var tok = parser.nextToken();
    let my_tag = tok.value;
    //
    const args = parser.parseSignature(null, true);
    parser.advanceAfterBlockEnd(tok.value);
    //
    let body = null;
    let hasClosingTag = false;
    // const currentPos = parser.peekToken();
    if (my_tag !== "component") {
      body = parser.parseUntilBlocks("endcomponent");
      parser.advanceAfterBlockEnd();
    }

    // Actually do work on block body and arguments
    return new nodes.CallExtension(this, "run", args, body ? [body] : []);
    //
  };
  this.run = function (context, ...args) {
    // context , ...args , body
    let body =
      typeof args[args.length - 1] === "function" ? args.pop() : () => "";
    // context = {env , ctx, blocks , exported}
    let comp_name = args[0];

    return comp_name + ":";
  };
}
