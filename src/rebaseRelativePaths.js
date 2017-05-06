import url from 'url'
import path from 'path'

const dataURIRegexp = /^['"]?data:/

function rebaseRelativePath (relativePath, cssBaseUrl, baseUrl) {
  const absolutePath = url.resolve(cssBaseUrl, relativePath)
  const absolutePathSection = url.parse(
    // rebase relative paths as absolute
    absolutePath
  ).path // then grab the path section

  const baseUrlPathSection = url.parse(
    baseUrl
  ).path

  if (!baseUrlPathSection) {
    return absolutePathSection.replace(/^\//, '') // remove leading slash
  }

  return path.relative(baseUrlPathSection, absolutePathSection)
}

function getBaseUrl (urlString) {
  return urlString.replace(/\/[^/]*$/, '/') // get folder
}

export default function rebaseRelativePaths (css, cssUrl, fullUrl) {
  const forceAbsolutePaths = url.parse(cssUrl).hostname !== url.parse(fullUrl).hostname
  const cssBaseUrl = getBaseUrl(cssUrl.replace(/\/$/, '')) // ensure no trailing slash
  const baseUrl = getBaseUrl(fullUrl)

  css = css.replace(/(@import )?url\((.+?)\)/g, function (match, importMatch, urlPath) {
    urlPath = urlPath.trim()
    // rebase path, if it's not a data-uri,
    // and not css import
    // TODO: data:image/svg can contain urls, which need to be rebased..
    if (!dataURIRegexp.test(urlPath) && !importMatch) {
      // fix remove leading quotes, as they can cause problems url.resolve function
      urlPath = urlPath.replace(/^['"]/, '').replace(/['"]$/, '')
      // if whole css is external, or this urlPath is external, then don't rebase it.
      let absolutePath = forceAbsolutePaths || url.parse(urlPath).hostname && url.parse(cssUrl).hostname !== url.parse(urlPath).hostname
      if (absolutePath) {
        urlPath = url.resolve(cssBaseUrl, urlPath)
      } else {
        // finally, do rebase the path
        urlPath = rebaseRelativePath(urlPath, cssBaseUrl, baseUrl)
      }
    }
    return (importMatch || '') + 'url(' + urlPath + ')'
  })
  return css
}
