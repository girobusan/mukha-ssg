import { findFunction, renderComponentToString } from "./components.js";
import { runtime } from "nunjucks";
import { getLogger } from "../logging.js";
import { renderString } from "nunjucks";
var log = getLogger("comps-tpl");
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
    console.log("context", Object.keys(context));
    console.log("context.ctx", Object.keys(context.ctx));
    let r;
    const body =
      typeof args[args.length - 1] === "function" ? args.pop() : null;
    // context = {env , ctx, blocks , exported}
    const comp_name = args.shift();
    const props = args[0];
    if (body) props.body = body();
    const FN = findFunction(comp_name);
    if (!FN) {
      log.warn("No component found:", comp_name);
      r = props.body || "";
    }
    try {
      r = renderComponentToString(comp_name, props, context);
    } catch (e) {
      // console.log(e);
      log.debug(e);
      log.info("Can not create element:", comp_name);
      r = FN(props.body);
    }

    return new runtime.SafeString(r);
  };
}
