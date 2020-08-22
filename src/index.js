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

function nextUnquotedSemicolon (string) {
  let openDoubleQuote = false;
  let openSingleQuote = false;
  return string.split('').findIndex(char => {
    if (char === '"') {
      openDoubleQuote = !openDoubleQuote;
    }
    if (char === "'") {
      openSingleQuote = !openSingleQuote;
    }
    return char === ';' && !openSingleQuote && !openDoubleQuote;
  })
}
function findImportDeclaration (css) {
  const startPosition = css.indexOf('@import ')
  if (startPosition === -1) {
    return {startPosition: -1, isFinal: true}
  }

  const localSemicolonPosition = nextUnquotedSemicolon(css.slice(startPosition))
  const isFinal = localSemicolonPosition === -1
  return {
    startPosition,
    endPosition: isFinal ? css.length : startPosition + localSemicolonPosition + 1,
    isFinal
  }
}

export function findAllImportDeclarations (css, offset = 0, importDeclarations = []) {
  const subCss = css.slice(offset)
  const {startPosition, endPosition, isFinal} = findImportDeclaration(subCss)
  if (startPosition !== -1) {
    const importDeclaration = subCss.slice(startPosition, endPosition)
    importDeclarations.push({
      importDeclaration,
      startPosition: offset + startPosition,
      endPosition: offset + endPosition
    })
  }
  if (isFinal) {
    return importDeclarations
  } else {
    return findAllImportDeclarations(css, offset + endPosition, importDeclarations)
  }
}

export default function inlineCssImports (css, baseUrl) {
  const importDeclarations = findAllImportDeclarations(css)

  const importCssPromises = importDeclarations.map(({importDeclaration, startPosition, endPosition}) => {
    const { importHref, mediaTypes } = getImportStringParts(importDeclaration.replace('@import ', ''))
    // ensure import url is absolute
    const importUrl = url.resolve(baseUrl, importHref)

    return _cssFromImport(importUrl, baseUrl, mediaTypes)
      .then(inlinedCss => {
        return {
          // now need to rebase all asset relative paths inside the resolved imported css
          importedCss: rebaseRelativePaths(inlinedCss, importUrl, baseUrl),
          startPosition, endPosition
        }
      })
  })

  // wait for all importCssPromises to resolve, then inline them into the css
  return Promise.all(importCssPromises)
    .then(resolvedCssImports => {
      resolvedCssImports.reverse().forEach(({importedCss, startPosition, endPosition}) => {
        css = css.slice(0, startPosition) + importedCss + css.slice(endPosition)
      })
      return Promise.resolve(css)
    })
}
