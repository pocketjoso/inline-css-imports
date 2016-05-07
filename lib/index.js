'use strict';
// partially adapted from https://github.com/remy/inliner/blob/master/lib/css.js#L39-L76

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports['default'] = inlineCssImports;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _nodeFetch = require('node-fetch');

var _nodeFetch2 = _interopRequireDefault(_nodeFetch);

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var IMPORT_PATTERN = /@import ([^;]*;?)/;
var IMPORT_PATTERN_GLOBAL = new RegExp(IMPORT_PATTERN.source, 'g');

var _cssFromImport = function _cssFromImport(importString, baseUrl) {
  var parts = importString.replace(/url/, '')
  // {
  .replace(/['}"()]/g, '').replace(/;$/, '').trim().split(' '); // clean up
  if (parts.length > 2) {
    console.error('something wrong, parts length should be no greater than 2', parts.length);
  }
  var importHref = parts[0];
  var mediaTypes = parts.slice(1);

  // ensure import url is absolute
  var importUrl = _url2['default'].resolve(baseUrl, importHref);
  return (0, _nodeFetch2['default'])(importUrl).then(function (response) {
    return response.status === 200 ? response.text() : '';
  }).then(function (importedCss) {
    if (/^</.test(importedCss)) {
      // ignore imports that resolve in something other than css (html, most likely)
      return Promise.resolve('');
    }
    importedCss = importedCss.replace(/\n$/, '');

    if (mediaTypes.length !== 0) {
      importedCss = '@media ' + mediaTypes.join(' ') + ' { ' + importedCss + ' }';
    }

    return inlineCssImports(importedCss, importUrl);
  })['catch'](console.log);
};

function inlineCssImports(css, baseUrl) {
  if (!IMPORT_PATTERN.test(css)) {
    return Promise.resolve(css);
  }

  // get promises for css corresponding to each @import declaration in this css
  var importCssPromises = [];
  var match = undefined;
  while ((match = IMPORT_PATTERN_GLOBAL.exec(css)) !== null) {
    importCssPromises.push(_cssFromImport(match[1], baseUrl));
  }

  // wait for all importCssPromises to resolve, then inline them into the css
  return Promise.all(importCssPromises).then(function (resolvedCssImports) {
    while (css.indexOf('@import ') !== -1) {
      var _match = (css.match(IMPORT_PATTERN) || [null, ''])[1];
      css = css.replace('@import ' + _match, resolvedCssImports.shift());
    }
    // and we're done!
    return Promise.resolve(css);
  });
}

module.exports = exports['default'];