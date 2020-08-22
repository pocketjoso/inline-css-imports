import test from 'ava'
import fs from 'fs'
import http from 'http'
import path from 'path'
import st from 'st'
import inlineCssImports, { getImportStringParts, findAllImportDeclarations } from '../lib/index'

const PORT = 54321
const FIXTURES_DIR = path.resolve(__dirname, 'fixtures')

const server = http.createServer(
  st(FIXTURES_DIR)
).listen(PORT)

const failTest = function (t) {
  t.fail()
  t.end()
  server.close()
}

const runImportTest = function (testLabel, cssFileName, expectedFileName) {
  test(testLabel, t => {
    const originalCss = fs.readFileSync(path.join(FIXTURES_DIR, cssFileName), 'utf8')
    const expectedCss = expectedFileName ? fs.readFileSync(path.join(FIXTURES_DIR, expectedFileName), 'utf8') : ''

    return inlineCssImports(originalCss, `http://localhost:${PORT}/${cssFileName}`)
      .then(resultingCss => t.is(resultingCss.trim(), expectedCss.trim()))
      .catch(e => {
        console.log(e)
        failTest(t)
      })
  })
}

const runImportDeclarationTest = function (input, expectedConfig) {
  test(`importDeclaration test for ${input}`, t => {
    const importDeclarations = findAllImportDeclarations(input)
    const importDeclaration = importDeclarations[0].importDeclaration
    if (!importDeclaration) {
      t.fail('did not match any @import css declaration!')
      return
    }

    const { importHref, mediaTypes } = getImportStringParts(importDeclaration.replace('@import ', ''))
    t.is(importHref, expectedConfig.importHref)
    t.deepEqual(mediaTypes, expectedConfig.mediaTypes)
    t.pass()
  })

}

server.on('listening', () => {
  console.log('server up, start tests')

  runImportTest('basic', 'basic.css', 'reset.css')
  runImportTest('core', 'core.css', 'core--result.css')
  runImportTest('nested', 'nested-top.css', 'nested--result.css')
  runImportTest('nested', 'nested-top.css', 'nested--result.css')
  runImportTest('missing', 'import-nested-with-relative-asset-path.css', 'import-nested-with-relative-asset-path--result.css')
  runImportTest('commented-import', 'commented-import.css', 'commented-import--result.css')

  // test invalid imports, ensure doesn't cause infinite loop
  runImportTest('invalid', 'invalid.css')
  runImportTest('import self', 'import-self.css')
})

runImportDeclarationTest('@import url(reset.css)', {
  importHref: 'reset.css',
  mediaTypes: []
})

runImportDeclarationTest('@import "reset.css" print;', {
  importHref: 'reset.css',
  mediaTypes: ['print']
})

// SPACES in url
runImportDeclarationTest('@import "https://fonts.googleapis.com/css?family=Roboto:400, 100";', {
  importHref: 'https://fonts.googleapis.com/css?family=Roboto:400, 100',
  mediaTypes: []
})

runImportDeclarationTest('@import "https://fonts.googleapis.com/css?family=Roboto:400, 100" screen;', {
  importHref: 'https://fonts.googleapis.com/css?family=Roboto:400, 100',
  mediaTypes: ['screen']
})

// SEMI COLON in url
runImportDeclarationTest('@import "https://fonts.googleapis.com/css2?family=Muli:wght@400;700&display=swap";', {
  importHref: 'https://fonts.googleapis.com/css2?family=Muli:wght@400;700&display=swap',
  mediaTypes: []
})
