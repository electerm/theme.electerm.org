/**
 * Generate a static list of electerm's built-in themes.
 *
 * The @electerm/electerm-themes package exports an array of theme text
 * strings (the same format used by convertTheme/convertThemeToText). We
 * parse each one into a structured { name, themeConfig, uiThemeConfig }
 * object and write it to src/static/electerm-themes.json so the gallery
 * can show electerm's classic themes as a static, dependency-free list.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import electermThemes from '@electerm/electerm-themes'
import { convertTheme } from '../js/lib/theme.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const OUT = path.resolve(ROOT, 'src/static/electerm-themes.json')

export function buildElectermThemes () {
  const list = (electermThemes || []).map((txt) => {
    const t = convertTheme(txt || '')
    return {
      name: t.name || 'Untitled',
      themeConfig: t.themeConfig || {},
      uiThemeConfig: t.uiThemeConfig || {}
    }
  })
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify(list, null, 2), 'utf-8')
  console.log(`  ✓ electerm-themes.json (${list.length} themes) → src/static/electerm-themes.json`)
  return list.length
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  buildElectermThemes()
}
