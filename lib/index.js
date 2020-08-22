'use strict';
// partially adapted from https://github.com/remy/inliner/blob/master/lib/css.js#L39-L76

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.getImportStringParts = getImportStringParts;
exports.findAllImportDeclarations = findAllImportDeclarations;
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

function nextUnquotedSemicolon(string) {
  var openDoubleQuote = false;
  var openSingleQuote = false;
  return string.split('').findIndex(function (char) {
    if (char === '"') {
      openDoubleQuote = !openDoubleQuote;
    }
    if (char === "'") {
      openSingleQuote = !openSingleQuote;
    }
    return char === ';' && !openSingleQuote && !openDoubleQuote;
  });
}
function findImportDeclaration(css) {
  var startPosition = css.indexOf('@import ');
  if (startPosition === -1) {
    return { startPosition: -1, isFinal: true };
  }

  var localSemicolonPosition = nextUnquotedSemicolon(css.slice(startPosition));
  var isFinal = localSemicolonPosition === -1;
  return {
    startPosition: startPosition,
    endPosition: isFinal ? css.length : startPosition + localSemicolonPosition + 1,
    isFinal: isFinal
  };
}

function findAllImportDeclarations(_x3) {
  var _arguments = arguments;
  var _again = true;

  _function: while (_again) {
    var css = _x3;
    var offset = _arguments.length <= 1 || _arguments[1] === undefined ? 0 : _arguments[1];
    _again = false;
    var importDeclarations = _arguments.length <= 2 || _arguments[2] === undefined ? [] : _arguments[2];

    var subCss = css.slice(offset);

    var _findImportDeclaration = findImportDeclaration(subCss);

    var startPosition = _findImportDeclaration.startPosition;
    var endPosition = _findImportDeclaration.endPosition;
    var isFinal = _findImportDeclaration.isFinal;

    if (startPosition !== -1) {
      var importDeclaration = subCss.slice(startPosition, endPosition);
      importDeclarations.push({
        importDeclaration: importDeclaration,
        startPosition: offset + startPosition,
        endPosition: offset + endPosition
      });
    }
    if (isFinal) {
      return importDeclarations;
    } else {
      _arguments = [_x3 = css, offset + endPosition, importDeclarations];
      _again = true;
      offset = importDeclarations = subCss = _findImportDeclaration = startPosition = endPosition = isFinal = importDeclaration = undefined;
      continue _function;
    }
  }
}

function inlineCssImports(css, baseUrl) {
  var importDeclarations = findAllImportDeclarations(css);

  var importCssPromises = importDeclarations.map(function (_ref) {
    var importDeclaration = _ref.importDeclaration;
    var startPosition = _ref.startPosition;
    var endPosition = _ref.endPosition;

    var _getImportStringParts = getImportStringParts(importDeclaration.replace('@import ', ''));

    var importHref = _getImportStringParts.importHref;
    var mediaTypes = _getImportStringParts.mediaTypes;

    // ensure import url is absolute
    var importUrl = _url2['default'].resolve(baseUrl, importHref);

    return _cssFromImport(importUrl, baseUrl, mediaTypes).then(function (inlinedCss) {
      return {
        // now need to rebase all asset relative paths inside the resolved imported css
        importedCss: (0, _rebaseRelativePaths2['default'])(inlinedCss, importUrl, baseUrl),
        startPosition: startPosition, endPosition: endPosition
      };
    });
  });

  // wait for all importCssPromises to resolve, then inline them into the css
  return Promise.all(importCssPromises).then(function (resolvedCssImports) {
    resolvedCssImports.reverse().forEach(function (_ref2) {
      var importedCss = _ref2.importedCss;
      var startPosition = _ref2.startPosition;
      var endPosition = _ref2.endPosition;

      css = css.slice(0, startPosition) + importedCss + css.slice(endPosition);
    });
    return Promise.resolve(css);
  });
}