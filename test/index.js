import test from 'ava'
import fs from 'fs'
import http from 'http'
import path from 'path'
import st from 'st'
import inlineCssImports from '../lib/index'

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
      .catch(() => failTest(t))
  })
}

server.on('listening', () => {
  console.log('server up, start tests')

  runImportTest('basic', 'basic.css', 'reset.css')
  runImportTest('core', 'core.css', 'core--result.css')
  runImportTest('nested', 'nested-top.css', 'nested--result.css')
  runImportTest('missing', 'missing.css')
  runImportTest('commented-import', 'commented-import.css', 'commented-import--result.css')

  // test invalid imports, ensure doesn't cause infinite loop
  runImportTest('invalid', 'invalid.css')
  runImportTest('import self', 'import-self.css')
})
