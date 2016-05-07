'use strict'
// partially adapted from https://github.com/remy/inliner/blob/master/lib/css.js#L39-L76

import fetch from 'node-fetch'
import url from 'url'

const IMPORT_PATTERN = /@import ([^;]*;?)/
const IMPORT_PATTERN_GLOBAL = new RegExp(IMPORT_PATTERN.source, 'g')

const _cssFromImport = function (importString, baseUrl) {
  const parts = importString.replace(/url/, '')
    // {
    .replace(/['}"()]/g, '')
    .replace(/;$/, '')
    .trim()
    .split(' ') // clean up
  if (parts.length > 2) {
    console.error('something wrong, parts length should be no greater than 2', parts.length)
  }
  const importHref = parts[0]
  const mediaTypes = parts.slice(1)

  // ensure import url is absolute
  const importUrl = url.resolve(baseUrl, importHref)
  return fetch(importUrl)
  .then(response => response.status === 200 ? response.text() : '')
  .then(importedCss => {
    if (/^</.test(importedCss)) {
      // ignore imports that resolve in something other than css (html, most likely)
      return Promise.resolve('')
    }
    importedCss = importedCss.replace(/\n$/, '')

    if (mediaTypes.length !== 0) {
      importedCss = `@media ${mediaTypes.join(' ')} { ${importedCss} }`
    }

    return inlineCssImports(importedCss, importUrl)
  }).catch(console.log)
}

export default function inlineCssImports (css, baseUrl) {
  if (!IMPORT_PATTERN.test(css)) {
    return Promise.resolve(css)
  }

  // get promises for css corresponding to each @import declaration in this css
  let importCssPromises = []
  let match
  while ((match = IMPORT_PATTERN_GLOBAL.exec(css)) !== null) {
    importCssPromises.push(_cssFromImport(match[1], baseUrl))
  }

  // wait for all importCssPromises to resolve, then inline them into the css
  return Promise.all(importCssPromises).then(resolvedCssImports => {
    while (css.indexOf('@import ') !== -1) {
      const match = (css.match(IMPORT_PATTERN) || [null, ''])[1]
      css = css.replace(`@import ${match}`, resolvedCssImports.shift())
    }
    // and we're done!
    return Promise.resolve(css)
  })
}
