'use strict';
// adapted from https://github.com/remy/inliner/blob/master/lib/css.js#L39-L76
// TODO: test test test, especially with nested imports
// should setup test fixture for that..
// need to run server for it? or host online?

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.inlineCssImports = inlineCssImports;

function _typeof(obj) { return obj && typeof Symbol !== "undefined" && obj.constructor === Symbol ? "symbol" : typeof obj; }

function inlineCssImports(css, baseUrl) {
  console.log('_inlineCssImports', css.length);
  if (css.indexOf('@import') !== -1) {
    var _ret = (function () {
      var match = (css.match(/@import\s*([^;]*;)/) || [null, ''])[1];
      var parts = match.replace(/url/, '').replace(/['}"()]/g, '').trim().split(' '); // clean up
      console.log('parts length should be no greater than 2', parts.length);
      var importHref = parts[0];
      var mediaTypes = parts.slice(1);
      // need to make the import url absolute
      var importUrl = url.resolve(baseUrl, importHref);

      console.log('fetching import css', importUrl);
      return {
        v: fetch(importUrl).then(function (response) {
          return response.text();
        }).then(function (importedCss) {
          if (mediaTypes.length !== 0) {
            console.log('has mediaTypes', mediaTypes.join(' '));
            importedCss = '@media ' + mediaTypes.join(' ') + ' { ' + importedCss + ' }';
          }
          console.log('got it', importedCss.length);

          // inline into original css
          console.log('replace', '@import ' + match);
          css = css.replace('@import ' + match, importedCss);
          console.log('after replace', css.length);
          return _inlineCssImports(css, importUrl);
        }).catch(console.log)
      };
    })();

    if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
  } else {
    console.log('done inlining imports');
    return Promise.resolve(css);
  }
}