/**
 * Main Cloudflare Worker entry point.
 *
 * Architecture:
 * - /api/*  → Hono API router (auth, me, themes, meta, admin)
 * - /admin, /login-admin → admin guard (session check) → serve static
 * - /user   → user guard (session check) → serve static
 * - /*      → static assets (built HTML pages)
 */
import { Hono } from 'hono'
import { api } from './routes/index.js'
import { verifySession, readCookie, SESSION_COOKIE } from './auth/session.js'
import { getRow } from './db.js'

const app = new Hono()

// Normalize trailing slashes for API routes (strip trailing slash except root)
app.use('/api/*', async (c, next) => {
  const url = new URL(c.req.url)
  if (url.pathname.length > 1 && url.pathname.endsWith('/') && url.pathname.startsWith('/api/')) {
    url.pathname = url.pathname.replace(/\/+$/, '')
    return app.fetch(new Request(url.toString(), c.req.raw), c.env, c.executionCtx)
  }
  await next()
})

// Health check
app.get('/health', (c) => c.json({ ok: true, env: c.env.ENVIRONMENT }))

// API routes
app.route('/api', api)

// ── Admin guard ───────────────────────────────────────────────
async function adminGuard (c) {
  const token = readCookie(c.req.raw, SESSION_COOKIE)
  if (!token) return c.redirect(new URL('/login-admin', c.req.url).toString())

  const identity = await verifySession(c.env, token)
  if (!identity) return c.redirect(new URL('/login-admin', c.req.url).toString())

  const row = await getRow(c.env.DB, 'SELECT role, status FROM users WHERE id = ?', identity.id)
  if (!row || row.status === 'disabled' || row.role !== 'admin') {
    return c.redirect(new URL('/login-admin?error=denied', c.req.url).toString())
  }

  // Serve static admin page
  return c.env.ASSETS.fetch(c.req.raw)
}

app.get('/admin', adminGuard)
app.get('/admin/', adminGuard)

// ── User guard ────────────────────────────────────────────────
async function userGuard (c) {
  const token = readCookie(c.req.raw, SESSION_COOKIE)
  if (!token) return c.redirect(new URL('/login', c.req.url).toString())

  const identity = await verifySession(c.env, token)
  if (!identity) return c.redirect(new URL('/login', c.req.url).toString())

  const row = await getRow(c.env.DB, 'SELECT status FROM users WHERE id = ?', identity.id)
  if (!row || row.status === 'disabled') {
    return c.redirect(new URL('/login?error=disabled', c.req.url).toString())
  }

  // Serve static user page
  return c.env.ASSETS.fetch(c.req.raw)
}

app.get('/user', userGuard)
app.get('/user/', userGuard)

// ── Theme detail page (SPA-like, serve static HTML) ───────────
app.get('/theme/:id', async (c) => {
  // Fetch /theme/ which serves the index.html via ASSETS directory index
  const assetUrl = new URL('/theme/', c.req.url)
  const res = await c.env.ASSETS.fetch(new Request(assetUrl, c.req.raw))
  // Return the response body with 200 status (avoid redirect to /theme/)
  if (res.status >= 300 && res.status < 400) {
    const finalUrl = new URL(res.headers.get('location') || '/theme/', c.req.url)
    const finalRes = await c.env.ASSETS.fetch(new Request(finalUrl, c.req.raw))
    return new Response(finalRes.body, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    })
  }
  return new Response(res.body, {
    status: 200,
    headers: res.headers
  })
})

// ── Static assets (catch-all) ─────────────────────────────────
app.get('*', async (c) => {
  const res = await c.env.ASSETS.fetch(c.req.raw)
  if (res.status === 404) {
    const notFoundUrl = new URL('/404.html', c.req.url)
    const notFoundRes = await c.env.ASSETS.fetch(new Request(notFoundUrl, c.req.raw))
    return new Response(notFoundRes.body, {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    })
  }
  return res
})

export default {
  async fetch (request, env, ctx) {
    return app.fetch(request, env, ctx)
  }
}
