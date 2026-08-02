/**
 * Build ESM JS bundles using esbuild.
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import esbuild from 'esbuild'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const JS_DIR = path.resolve(ROOT, 'src/js')
const PAGES_DIR = path.join(JS_DIR, 'pages')
const OUTPUT_DIR = path.resolve(ROOT, 'public/js')

export async function buildJS () {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  const result = {}

  const pageFiles = fs.readdirSync(PAGES_DIR).filter((f) => f.endsWith('.js'))

  for (const file of pageFiles) {
    const pageName = path.basename(file, '.js')
    const entryPath = path.join(PAGES_DIR, file)

    const buildResult = await esbuild.build({
      entryPoints: [entryPath],
      bundle: true,
      format: 'esm',
      target: 'es2020',
      minify: true,
      write: false,
      sourcemap: false
    })

    const jsContent = buildResult.outputFiles[0].text
    const hash = crypto.createHash('md5').update(jsContent).digest('hex').slice(0, 8)
    const filename = `${pageName}.${hash}.js`

    fs.writeFileSync(path.join(OUTPUT_DIR, filename), jsContent, 'utf-8')
    fs.writeFileSync(path.join(OUTPUT_DIR, `${pageName}.js`), jsContent, 'utf-8')

    result[pageName] = `/js/${filename}`
    console.log(`  ✓ JS: ${filename}`)
  }

  return result
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  buildJS().then(() => console.log('JS build complete.'))
}
