'use strict'
// adapted from https://github.com/remy/inliner/blob/master/lib/css.js#L39-L76

import fetch from 'node-fetch'
import url from 'url'

const SAFETY_BREAK_THRESHOLD = 100
let safeBreakIterator = 0

export default function inlineCssImports (css, baseUrl) {
  if (css.indexOf('@import') !== -1) {
    const match = (css.match(/@import\s*([^;]*;?)/) || [null, ''])[1]
    const parts = match.replace(/url/, '')
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
    .then(response => response.text())
    .then(importedCss => {
      importedCss = importedCss.replace(/\n$/, '')
      if (mediaTypes.length !== 0) {
        importedCss = `@media ${mediaTypes.join(' ')} { ${importedCss} }`
      }
      // inline into original css
      css = css.replace(`@import ${match}`, importedCss)
      safeBreakIterator++
      if (safeBreakIterator < SAFETY_BREAK_THRESHOLD) {
        return inlineCssImports(css, importUrl)
      } else {
        console.error('too much nesting, aborting..')
        return css
      }
    }).catch(console.log)
  } else {
    return Promise.resolve(css)
  }
}
