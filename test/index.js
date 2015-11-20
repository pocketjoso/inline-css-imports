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

const runImportTest = function (cssFileName, expectedFileName) {
  test('basic test', t => {
    const originalCss = fs.readFileSync(path.join(FIXTURES_DIR, cssFileName), 'utf8')
    const expectedCss = fs.readFileSync(path.join(FIXTURES_DIR, expectedFileName), 'utf8')
    inlineCssImports(originalCss, `http://localhost:${PORT}/${cssFileName}`)
    .then(resultingCss => {
      if (!resultingCss) {
        failTest(t)
        return
      }
      console.log('got', resultingCss)
      console.log('\n\nexpected', expectedCss)
      // TODO: expect to result in
      t.pass()
      t.end()
      server.close()
    }).catch(() => failTest(t))
  })
}

server.on('listening', () => {
  console.log('server up, start tests')
  runImportTest('original.css', 'original--result.css')
})
