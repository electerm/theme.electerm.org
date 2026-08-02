/**
 * Dev server — Express app that serves Pug templates, compiled Stylus,
 * ESM JS, and static files. Proxies /api to the Worker.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import http from 'node:http'
import express from 'express'
import pug from 'pug'
import Stylus from 'stylus'
import { getPageRoutes, buildContext, VIEWS_DIR } from './lib/pages.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const STATIC_DIR = path.resolve(ROOT, 'src/static')
const STYLES_DIR = path.resolve(ROOT, 'src/styles')
const JS_DIR = path.resolve(ROOT, 'src/js')

const PORT = parseInt(process.env.DEV_PORT || '5678', 10)
const WORKER_PORT = 26789

const app = express()

app.set('trust proxy', true)

// ── Stylus CSS ──────────────────────────────────────────────
app.get('/css/style.css', (req, res) => {
  const entryPath = path.join(STYLES_DIR, 'main.styl')
  try {
    const stylusContent = fs.readFileSync(entryPath, 'utf-8')
    const css = Stylus(stylusContent)
      .set('filename', entryPath)
      .set('paths', [STYLES_DIR, path.join(STYLES_DIR, 'parts')])
      .set('compress', false)
      .render()
    res.setHeader('Content-Type', 'text/css')
    res.setHeader('Cache-Control', 'no-cache')
    res.send(css)
  } catch (err) {
    console.error('Stylus error:', err)
    res.status(500).send(`/* Stylus error: ${err} */`)
  }
})

// ── ESM JS (serve raw, no bundling in dev) ──────────────────
app.use('/js', express.static(JS_DIR, {
  setHeaders: (res) => {
    res.setHeader('Content-Type', 'application/javascript')
    res.setHeader('Cache-Control', 'no-cache')
  }
}))

// ── Static files ────────────────────────────────────────────
if (fs.existsSync(STATIC_DIR)) {
  app.use(express.static(STATIC_DIR, {
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'no-cache')
    }
  }))
}

// ── Proxy /api and /health to Worker ──────────────────────────
app.use(['/api', '/health'], (req, res) => {
  const proxyReq = http.request(
    {
      hostname: '127.0.0.1',
      port: WORKER_PORT,
      path: req.originalUrl,
      method: req.method,
      headers: { ...req.headers, host: `127.0.0.1:${WORKER_PORT}` }
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers)
      proxyRes.pipe(res)
    }
  )
  proxyReq.on('error', () => {
    res.status(502).json({ error: 'Worker not running. Start it with: npm start' })
  })
  req.pipe(proxyReq)
})

// ── Page rendering ──────────────────────────────────────────

function findRoute (urlPath) {
  const clean = urlPath.replace(/^\/+/, '').replace(/\/+$/, '')
  const segments = clean.split('/').filter(Boolean)

  if (segments.length === 0) {
    return { route: getPageRoutes().find((r) => r.pageKey === 'home') }
  }

  if (segments.length === 1) {
    const route = getPageRoutes().find((r) => r.segments.length === 1 && r.segments[0] === segments[0])
    if (route) return { route }
  }

  // Theme detail: /theme/:id
  if (segments.length === 2 && segments[0] === 'theme') {
    const route = getPageRoutes().find((r) => r.pageKey === 'theme-detail')
    if (route) return { route, extra: { themeId: segments[1] } }
  }

  return null
}

function renderPage (route, extra) {
  const jsPage = route.jsPage
  const jsPath = jsPage ? `/js/pages/${jsPage}.js` : null

  const context = buildContext(route, {
    isDev: true,
    isProd: false,
    cssPath: '/css/style.css',
    jsPath
  })

  if (extra) Object.assign(context, extra)

  const templatePath = path.join(VIEWS_DIR, route.template + '.pug')
  const compiled = pug.compileFile(templatePath, {
    basedir: VIEWS_DIR,
    pretty: true
  })

  return compiled(context)
}

app.use((req, res, next) => {
  if (req.method !== 'GET') return next()

  const urlPath = req.path

  if (path.extname(urlPath)) return next()

  const match = findRoute(urlPath)

  if (!match) {
    const notFoundRoute = getPageRoutes().find((r) => r.pageKey === '404')
    const html = renderPage(notFoundRoute)
    return res.status(404).send(html)
  }

  try {
    const html = renderPage(match.route, match.extra)
    res.setHeader('Content-Type', 'text/html')
    res.setHeader('Cache-Control', 'no-cache')
    res.send(html)
  } catch (err) {
    console.error('Render error:', err)
    res.status(500).send(`<pre>Render error: ${err}</pre>`)
  }
})

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║  🎨 theme.electerm.org Dev Server                ║
║                                                  ║
║  → http://127.0.0.1:${PORT}                        ║
║                                                  ║
║  Pug templates:  ✓                              ║
║  Stylus CSS:     ✓ (/css/style.css)             ║
║  ESM JS:         ✓ (/js/)                       ║
║  Static files:   ✓                              ║
║  API proxy:      → 127.0.0.1:${WORKER_PORT}           ║
║  Demo site:      → http://127.0.0.1:5580         ║
╚══════════════════════════════════════════════════╝
  `)
})
