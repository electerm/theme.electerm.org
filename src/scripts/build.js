/**
 * Main build orchestrator.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildStyles } from './build-styles.js'
import { buildJS } from './build-js.js'
import { buildStatic } from './build-static.js'
import { buildPages } from './build-pages.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const PUBLIC_DIR = path.resolve(ROOT, 'public')

async function main () {
  const isProd = process.env.NODE_ENV !== 'development'
  console.log(`\n🏗  Building theme.electerm.org (${isProd ? 'production' : 'development'})...\n`)

  console.log('🧹 Cleaning public/...')
  if (fs.existsSync(PUBLIC_DIR)) {
    fs.rmSync(PUBLIC_DIR, { recursive: true })
  }
  fs.mkdirSync(PUBLIC_DIR, { recursive: true })

  console.log('📦 Building styles...')
  const cssResult = buildStyles()

  console.log('📦 Building JS...')
  const jsResult = await buildJS()

  console.log('📦 Copying static files...')
  buildStatic()

  console.log('📦 Building pages...')
  buildPages(cssResult, jsResult, isProd)

  console.log('\n✅ Build complete! Output in public/\n')
}

main().catch((err) => {
  console.error('\n❌ Build failed:', err)
  process.exit(1)
})
