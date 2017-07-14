'use strict'
// partially adapted from https://github.com/remy/inliner/blob/master/lib/css.js#L39-L76

import fetch from 'node-fetch'
import url from 'url'
import https from 'https'

const fetchHttpsAgent = new https.Agent({
  // to allow dev servers with invalid certs.
  rejectUnauthorized: false
})

import rebaseRelativePaths from './rebaseRelativePaths'

const IMPORT_PATTERN = /@import ([^;]*;?)/
const IMPORT_PATTERN_GLOBAL = new RegExp(IMPORT_PATTERN.source, 'g')

const ARGS_REGEXP = /([^\s'"]+(['"])([^\2]*?)\2)|[^\s'"]+|(['"])([^\4]*?)\4/gi

export function getImportStringParts (importString) {
  const parts = importString.match(ARGS_REGEXP)
    .map(p => {
      return p.replace(/url/, '')
      // {
      .replace(/['}"()]/g, '')
      .replace(/;$/, '')
      .trim()
    })
    .filter(p => !!p)

  return {
    importHref: parts[0],
    mediaTypes: parts.slice(1)
  }
}

function _cssFromImport (importUrl, baseUrl, mediaTypes) {
  if (importUrl === baseUrl) {
    // cannot import itself - infinite recursion.
    // this can happen if importString is invalid (as well as if a stylesheet actually imports itself)
    console.log('avoided infinite recursion.. ', baseUrl)
    return Promise.resolve('')
  }
  return fetch(
    importUrl,
    {agent: url.parse(importUrl).protocol === 'https:' ? fetchHttpsAgent : undefined}
  )
  .then(response => response.status === 200 ? response.text() : '')
  .then(importedCss => {
    if (/^</.test(importedCss)) {
      // ignore imports that resolve in something other than css (html, most likely)
      return ''
    }
    importedCss = importedCss.replace(/\n$/, '')

    if (mediaTypes.length !== 0) {
      importedCss = `@media ${mediaTypes.join(' ')} { ${importedCss} }`
    }

    return inlineCssImports(importedCss, importUrl)
  })
  .catch(e => {
    console.log('inline-css-imports error fetching import url', importUrl, e)
    return Promise.resolve('')
  })
}

export default function inlineCssImports (css, baseUrl) {
  if (!IMPORT_PATTERN.test(css)) {
    return Promise.resolve(css)
  }

  // get promises for css corresponding to each @import declaration in this css
  let importCssPromises = []
  let match
  while ((match = IMPORT_PATTERN_GLOBAL.exec(css)) !== null) {
    const importString = match[1]
    const { importHref, mediaTypes } = getImportStringParts(importString)
    // ensure import url is absolute
    const importUrl = url.resolve(baseUrl, importHref)

    importCssPromises.push(
      _cssFromImport(importUrl, baseUrl, mediaTypes)
      .then(inlinedCss => {
        // now need to rebase all asset relative paths inside the resolved imported css
        return rebaseRelativePaths(inlinedCss, importUrl, baseUrl)
      })
    )
  }

  // wait for all importCssPromises to resolve, then inline them into the css
  return Promise.all(importCssPromises)
    .then(resolvedCssImports => {
      // then finally inject them back into the main css
      while (css.indexOf('@import ') !== -1) {
        const match = (css.match(IMPORT_PATTERN) || [null, ''])[1]
        css = css.replace(`@import ${match}`, resolvedCssImports.shift())
      }
      // and we're done!
      return Promise.resolve(css)
    })
}
