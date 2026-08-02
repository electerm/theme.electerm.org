/**
 * Copy static files to public/
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const STATIC_DIR = path.resolve(ROOT, 'src/static')
const PUBLIC_DIR = path.resolve(ROOT, 'public')

export function buildStatic () {
  if (!fs.existsSync(STATIC_DIR)) return
  copyDir(STATIC_DIR, PUBLIC_DIR)
  console.log('  ✓ Static files copied')
}

function copyDir (src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true })
  const entries = fs.readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  buildStatic()
}
