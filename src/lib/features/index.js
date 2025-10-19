const nunjucks = require("nunjucks");

export function runFeature(env, ...args) {
  const fName = args[0];
  try {
  } catch (e) {
    return "Feature doesn't work: " + fName;
  }
}

export function initFeatures(tpl_loader) {
  const featuresEnv = new nunjucks.Environment([tpl_loader], {
    autoescape: false,
    trimBlocks: true,
  });
  return {
    run: () => runFeature(featuresEnv, arguments),
  };
}
