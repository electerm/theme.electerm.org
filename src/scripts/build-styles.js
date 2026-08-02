/**
 * Build Stylus → CSS.
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import Stylus from 'stylus'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const STYLES_DIR = path.resolve(ROOT, 'src/styles')
const OUTPUT_DIR = path.resolve(ROOT, 'public/css')

export function buildStyles () {
  const entryPath = path.join(STYLES_DIR, 'main.styl')
  const stylusContent = fs.readFileSync(entryPath, 'utf-8')

  let css
  try {
    css = Stylus(stylusContent)
      .set('filename', entryPath)
      .set('paths', [STYLES_DIR, path.join(STYLES_DIR, 'parts')])
      .set('compress', true)
      .render()
  } catch (err) {
    console.error('Stylus compile error:', err)
    throw err
  }

  const hash = crypto.createHash('md5').update(css).digest('hex').slice(0, 8)
  const filename = `style.${hash}.css`

  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  fs.writeFileSync(path.join(OUTPUT_DIR, filename), css, 'utf-8')
  fs.writeFileSync(path.join(OUTPUT_DIR, 'style.css'), css, 'utf-8')

  console.log(`  ✓ Styles: ${filename}`)

  return { filename, path: path.join(OUTPUT_DIR, filename), url: `/css/${filename}` }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  buildStyles()
}
