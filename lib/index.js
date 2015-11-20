'use strict';
// adapted from https://github.com/remy/inliner/blob/master/lib/css.js#L39-L76

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports['default'] = inlineCssImports;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _nodeFetch = require('node-fetch');

var _nodeFetch2 = _interopRequireDefault(_nodeFetch);

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var SAFETY_BREAK_THRESHOLD = 100;
var safeBreakIterator = 0;

function inlineCssImports(css, baseUrl) {
  if (css.indexOf('@import') !== -1) {
    var _ret = (function () {
      var match = (css.match(/@import\s*([^;]*;?)/) || [null, ''])[1];
      var parts = match.replace(/url/, '').replace(/['}"()]/g, '').replace(/;$/, '').trim().split(' '); // clean up
      if (parts.length > 2) {
        console.error('something wrong, parts length should be no greater than 2', parts.length);
      }
      var importHref = parts[0];
      var mediaTypes = parts.slice(1);
      // ensure import url is absolute
      var importUrl = _url2['default'].resolve(baseUrl, importHref);

      return {
        v: (0, _nodeFetch2['default'])(importUrl).then(function (response) {
          return response.text();
        }).then(function (importedCss) {
          importedCss = importedCss.replace(/\n$/, '');
          if (mediaTypes.length !== 0) {
            importedCss = '@media ' + mediaTypes.join(' ') + ' { ' + importedCss + ' }';
          }
          // inline into original css
          css = css.replace('@import ' + match, importedCss);
          safeBreakIterator++;
          if (safeBreakIterator < SAFETY_BREAK_THRESHOLD) {
            return inlineCssImports(css, importUrl);
          } else {
            console.error('too much nesting, aborting..');
            return css;
          }
        })['catch'](console.log)
      };
    })();

    if (typeof _ret === 'object') return _ret.v;
  } else {
    return Promise.resolve(css);
  }
}

module.exports = exports['default'];