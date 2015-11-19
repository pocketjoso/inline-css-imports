'use strict'
// adapted from https://github.com/remy/inliner/blob/master/lib/css.js#L39-L76
// TODO: test test test, especially with nested imports
// should setup test fixture for that..
// need to run server for it? or host online?
export function inlineCssImports (css, baseUrl) {
  console.log('_inlineCssImports', css.length)
  if (css.indexOf('@import') !== -1) {
    const match = (css.match(/@import\s*([^;]*;)/) || [null, ''])[1]
    const parts = match.replace(/url/, '')
      .replace(/['}"()]/g, '')
      .trim()
      .split(' ') // clean up
    console.log('parts length should be no greater than 2', parts.length)
    const importHref = parts[0]
    const mediaTypes = parts.slice(1)
    // need to make the import url absolute
    const importUrl = url.resolve(baseUrl, importHref)

    console.log('fetching import css', importUrl)
    return fetch(importUrl)
    .then(response => response.text())
    .then(importedCss => {
      if (mediaTypes.length !== 0) {
        console.log('has mediaTypes', mediaTypes.join(' '))
        importedCss = `@media ${mediaTypes.join(' ')} { ${importedCss} }`
      }
      console.log('got it', importedCss.length)

      // inline into original css
      console.log('replace', `@import ${match}`)
      css = css.replace(`@import ${match}`, importedCss)
      console.log('after replace', css.length)
      return _inlineCssImports(css, importUrl)
    }).catch(console.log)
  } else {
    console.log('done inlining imports')
    return Promise.resolve(css)
  }
}
