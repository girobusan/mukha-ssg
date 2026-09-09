import { findFunction, renderComponentToString } from "./components.js";
import { runtime } from "nunjucks";
import { getLogger } from "../logging.js";
// import { renderString } from "nunjucks";
var log = getLogger("comps-tpl");
//

export function componentTag() {
  this.tags = ["component", "componentWrap"];
  this.parse = function(parser, nodes) {
    // console.log(parser.tokens[0]);
    var tok = parser.nextToken();
    let my_tag = tok.value;
    let my_closing_tag = "end" + tok.value;
    //
    const args = parser.parseSignature(null, true);
    parser.advanceAfterBlockEnd(tok.value);
    //
    let body = null;
    // let hasClosingTag = false;
    // const currentPos = parser.peekToken();
    if (my_tag === "componentWrap") {
      body = parser.parseUntilBlocks(my_closing_tag);
      parser.advanceAfterBlockEnd();
    }

    // Actually do work on block body and arguments
    return new nodes.CallExtension(this, "run", args, body ? [body] : []);
    //
  };
  this.run = function(context, ...args) {
    /*
context [ 'env', 'ctx', 'blocks', 'exported' ]
context.ctx [
  'config', 'datasets',
  'data',   'splitToPages',
  'meta',   'path',
  'list',   'file',
  'page',   'saveData',
  'util'
]
     */
    let r;
    const body =
      // last arguments, if it is function
      typeof args[args.length - 1] === "function" ? args.pop() : null;
    // first positional argument
    const comp_name = args.shift();
    // argument with special property
    const props = args.filter((e) => e.__keywords).shift() || {};
    // other positional arguments?
    if (props.__keywords) {
      delete props.__keywords;
    }
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
