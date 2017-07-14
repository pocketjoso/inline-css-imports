'use strict';
// partially adapted from https://github.com/remy/inliner/blob/master/lib/css.js#L39-L76

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.getImportStringParts = getImportStringParts;
exports['default'] = inlineCssImports;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _nodeFetch = require('node-fetch');

var _nodeFetch2 = _interopRequireDefault(_nodeFetch);

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _https = require('https');

var _https2 = _interopRequireDefault(_https);

var _rebaseRelativePaths = require('./rebaseRelativePaths');

var _rebaseRelativePaths2 = _interopRequireDefault(_rebaseRelativePaths);

var fetchHttpsAgent = new _https2['default'].Agent({
  // to allow dev servers with invalid certs.
  rejectUnauthorized: false
});

var IMPORT_PATTERN = /@import ([^;]*;?)/;
var IMPORT_PATTERN_GLOBAL = new RegExp(IMPORT_PATTERN.source, 'g');

var ARGS_REGEXP = /([^\s'"]+(['"])([^\2]*?)\2)|[^\s'"]+|(['"])([^\4]*?)\4/gi;

function getImportStringParts(importString) {
  var parts = importString.match(ARGS_REGEXP).map(function (p) {
    return p.replace(/url/, '')
    // {
    .replace(/['}"()]/g, '').replace(/;$/, '').trim();
  }).filter(function (p) {
    return !!p;
  });

  return {
    importHref: parts[0],
    mediaTypes: parts.slice(1)
  };
}

function _cssFromImport(importUrl, baseUrl, mediaTypes) {
  if (importUrl === baseUrl) {
    // cannot import itself - infinite recursion.
    // this can happen if importString is invalid (as well as if a stylesheet actually imports itself)
    console.log('avoided infinite recursion.. ', baseUrl);
    return Promise.resolve('');
  }
  return (0, _nodeFetch2['default'])(importUrl, { agent: _url2['default'].parse(importUrl).protocol === 'https:' ? fetchHttpsAgent : undefined }).then(function (response) {
    return response.status === 200 ? response.text() : '';
  }).then(function (importedCss) {
    if (/^</.test(importedCss)) {
      // ignore imports that resolve in something other than css (html, most likely)
      return '';
    }
    importedCss = importedCss.replace(/\n$/, '');

    if (mediaTypes.length !== 0) {
      importedCss = '@media ' + mediaTypes.join(' ') + ' { ' + importedCss + ' }';
    }

    return inlineCssImports(importedCss, importUrl);
  })['catch'](function (e) {
    console.log('inline-css-imports error fetching import url', importUrl, e);
    return Promise.resolve('');
  });
}

function inlineCssImports(css, baseUrl) {
  if (!IMPORT_PATTERN.test(css)) {
    return Promise.resolve(css);
  }

  // get promises for css corresponding to each @import declaration in this css
  var importCssPromises = [];
  var match = undefined;

  var _loop = function () {
    var importString = match[1];

    var _getImportStringParts = getImportStringParts(importString);

    var importHref = _getImportStringParts.importHref;
    var mediaTypes = _getImportStringParts.mediaTypes;

    // ensure import url is absolute
    var importUrl = _url2['default'].resolve(baseUrl, importHref);

    importCssPromises.push(_cssFromImport(importUrl, baseUrl, mediaTypes).then(function (inlinedCss) {
      // now need to rebase all asset relative paths inside the resolved imported css
      return (0, _rebaseRelativePaths2['default'])(inlinedCss, importUrl, baseUrl);
    }));
  };

  while ((match = IMPORT_PATTERN_GLOBAL.exec(css)) !== null) {
    _loop();
  }

  // wait for all importCssPromises to resolve, then inline them into the css
  return Promise.all(importCssPromises).then(function (resolvedCssImports) {
    // then finally inject them back into the main css
    while (css.indexOf('@import ') !== -1) {
      var _match = (css.match(IMPORT_PATTERN) || [null, ''])[1];
      css = css.replace('@import ' + _match, resolvedCssImports.shift());
    }
    // and we're done!
    return Promise.resolve(css);
  });
}