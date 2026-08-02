/**
 * Build all Pug pages to static HTML.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pug from 'pug'
import { getPageRoutes, buildContext, VIEWS_DIR } from './lib/pages.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const PUBLIC_DIR = path.resolve(ROOT, 'public')

export function buildPages (cssResult, jsResult, isProd = true) {
  let count = 0

  const routes = getPageRoutes()

  for (const route of routes) {
    const jsPath = route.jsPage ? (jsResult[route.jsPage] || null) : null

    // Built pages always use production demo URL.
    // Dev server (dev.js) renders Pug at runtime with isDev=true,
    // so it uses http://127.0.0.1:5580 as the demo URL.
    // Visit http://127.0.0.1:5678 for dev mode (not port 26789).
    const context = buildContext(route, {
      isDev: false,
      isProd,
      cssPath: cssResult.url,
      jsPath
    })

    const templatePath = path.join(VIEWS_DIR, route.template + '.pug')

    const compiled = pug.compileFile(templatePath, {
      basedir: VIEWS_DIR,
      pretty: false
    })

    const html = compiled(context)

    const outputPath = path.join(PUBLIC_DIR, route.outputFile)
    fs.mkdirSync(path.dirname(outputPath), { recursive: true })
    fs.writeFileSync(outputPath, html, 'utf-8')
    count++
  }

  console.log(`  ✓ Pages: ${count} HTML files generated`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  buildPages(
    { filename: 'style.css', path: '', url: '/css/style.css' },
    {},
    false
  )
}
