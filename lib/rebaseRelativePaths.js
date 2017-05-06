'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports['default'] = rebaseRelativePaths;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var dataURIRegexp = /^['"]?data:/;

function rebaseRelativePath(relativePath, cssBaseUrl, baseUrl) {
  var absolutePath = _url2['default'].resolve(cssBaseUrl, relativePath);
  var absolutePathSection = _url2['default'].parse(
  // rebase relative paths as absolute
  absolutePath).path; // then grab the path section

  var baseUrlPathSection = _url2['default'].parse(baseUrl).path;

  if (!baseUrlPathSection) {
    return absolutePathSection.replace(/^\//, ''); // remove leading slash
  }

  return _path2['default'].relative(baseUrlPathSection, absolutePathSection);
}

function getBaseUrl(urlString) {
  return urlString.replace(/\/[^/]*$/, '/'); // get folder
}

function rebaseRelativePaths(css, cssUrl, fullUrl) {
  var forceAbsolutePaths = _url2['default'].parse(cssUrl).hostname !== _url2['default'].parse(fullUrl).hostname;
  var cssBaseUrl = getBaseUrl(cssUrl.replace(/\/$/, '')); // ensure no trailing slash
  var baseUrl = getBaseUrl(fullUrl);

  css = css.replace(/(@import )?url\((.+?)\)/g, function (match, importMatch, urlPath) {
    urlPath = urlPath.trim();
    // rebase path, if it's not a data-uri,
    // and not css import
    // TODO: data:image/svg can contain urls, which need to be rebased..
    if (!dataURIRegexp.test(urlPath) && !importMatch) {
      // fix remove leading quotes, as they can cause problems url.resolve function
      urlPath = urlPath.replace(/^['"]/, '').replace(/['"]$/, '');
      // if whole css is external, or this urlPath is external, then don't rebase it.
      var absolutePath = forceAbsolutePaths || _url2['default'].parse(urlPath).hostname && _url2['default'].parse(cssUrl).hostname !== _url2['default'].parse(urlPath).hostname;
      if (absolutePath) {
        urlPath = _url2['default'].resolve(cssBaseUrl, urlPath);
      } else {
        // finally, do rebase the path
        urlPath = rebaseRelativePath(urlPath, cssBaseUrl, baseUrl);
      }
    }
    return (importMatch || '') + 'url(' + urlPath + ')';
  });
  return css;
}

module.exports = exports['default'];