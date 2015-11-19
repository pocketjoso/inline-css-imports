#Inline css @imports

[![NPM version](https://badge.fury.io/js/inline-css-imports.svg)](http://badge.fury.io/js/inline-css-imports)

You have a css string with `@import` statements, you want them resolved and inlined into said css string.
Code mostly adapted from @remy’s [inliner]()
Recursively inlines css imports, so works for nested `@import`s too.

## Requirements
`Node@^0.12` (could use earlier version if you polyfilled `Promise`).

## Usage
`npm install --save inline-css-imports`

```
import inlineCssImports from 'inline-css-imports'

// css -- string || css to inline imports inside
// baseUrl -- string || url where css is hosted - required to resolve relative import paths

inlineCssImports(css, baseUrl)
.then(function (updatedCss) {
  console.log('I have all css @imports inlined!', updatedCss)
})
```
