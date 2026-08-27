import { findFunction } from "./components.js";
//

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
    if (my_tag === "componentWrap") {
      body = parser.parseUntilBlocks("endcomponentWrap");
      parser.advanceAfterBlockEnd();
    }

    // Actually do work on block body and arguments
    return new nodes.CallExtension(this, "run", args, body ? [body] : []);
    //
  };
  this.run = function (context, ...args) {
    // context , ...args , body
    const body =
      typeof args[args.length - 1] === "function" ? args.pop() : null;
    // context = {env , ctx, blocks , exported}
    const comp_name = args.shift();
    const props = args[0];
    if (body) props.body = body();
    const FN = findFunction(comp_name);
    if (FN) {
      return FN(props);
    } else {
    }

    return comp_name + " is not here";
  };
}
