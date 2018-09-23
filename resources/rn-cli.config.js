/*
  This is a custom React Native/Metro Transformer to fix issues
  with bundling a large single JS file. It works with RNv0.57.

  Add the command below to package.json or project.clj.
  node --expose-gc --max_old_space_size=8192 \
    './node_modules/react-native/local-cli/cli.js' bundle \
    --sourcemap-output main.jsbundle.map \
    --bundle-output ios/main.jsbundle \
    --entry-file release.ios.js \
    --platform ios \
    --dev true \
    --assets-dest ios \
    --config=./rn-cli.config.js",
*/

var DEBUG = true;
var debug = DEBUG ?
  function(){ console.log.call(this, [].slice.call(arguments)); } :
  function(){};

// Big files can slow down Metro, so we'll dump GC every 30 seconds to be safe.
(function scheduleGc() {
  if (!global.gc) {
    console.log("Garbage collection is not exposed");
    return;
  }

  var timeoutId = setTimeout(function() {
    global.gc();
    console.log("Manual gc", process.memoryUsage());
    scheduleGc();
  }, 30 * 1000);
  timeoutId.unref();
})();

// Custom Metro Transform (validated with React Native v0.57)
var path = require("path");
var fs = require("fs");
var defaultTransformer = require("./node_modules/metro/src/reactNativeTransformer");

function clojurescriptTransformer(code, filename) {
  console.log("Generating sourcemap for " + filename);
  var map = fs.readFileSync(filename + ".map", { encoding: "utf8" });
  var sourceMap = JSON.parse(map);

  var sourcesContent = [];
  sourceMap.sources.forEach(function(path) {
    var sourcePath = __dirname + "/" + path;
    var isDirectory = path.indexOf(".") === -1;
    if (isDirectory) {
      debug("ignore");
      return;
    }

    try {
      // try and find the corresponding `.cljs` file first
      var file = sourcePath.replace(".js", ".cljs");
      debug(file);
      sourcesContent.push(fs.readFileSync(file, "utf8"));
    } catch (e) {
      // otherwise fallback to whatever is listed as the source
      debug("sourcePath", path);
      try {
        sourcesContent.push(fs.readFileSync(sourcePath, "utf8"));
      } catch (e) {
        if (sourcePath.match(/\.js$/) !== null) {
          console.warn("clojurescript transformer error with file ", sourcePath);
        }
      }
    }
  });
  sourceMap.sourcesContent = sourcesContent;

  return {
    filename: filename,
    code: code.replace("# sourceMappingURL=", ""),
    map: sourceMap
  };
}


var customClojurescriptTransformer = function(data){
  var isCljsEntryFile = data.filename.match(/index\.*\.js/) !== null;
  console.log('d', data.filename);
  if (isCljsEntryFile) {
    debug("using custom clojurescript transformer");
    return clojurescriptTransformer(data.src, data.filename);
  } else {
    return defaultTransformer.transform(data);
  }
}

// @see https://facebook.github.io/metro/docs/en/configuration
var rnCliConfig = {
  projectRoot: path.resolve(__dirname),
  getTransformModulePath: () => require.resolve("./rn-cli.config")
}

module.exports = {
  transform: customClojurescriptTransformer,
  projectRoot: projectRoot,
  getTransformModulePath: rnCliConfig.getTransformModulePath
};
