/**
 * Auth routes — GitHub OAuth login/logout with popup support.
 */
import { Hono } from 'hono'
import { buildAuthUrl, exchangeCode, getUserInfo, findOrCreateUser } from '../auth/github.js'
import {
  signSession,
  readCookie,
  sessionCookie,
  oauthStateCookie,
  clearOauthStateCookie,
  adminLoginCookie,
  clearAdminLoginCookie,
  OAUTH_STATE_COOKIE,
  ADMIN_LOGIN_COOKIE
} from '../auth/session.js'
import { redirectWithCookies, siteUrl, popupDoneUrl, jsonResponse } from '../http.js'
import { getRow } from '../db.js'

export const authRouter = new Hono()

authRouter.use('*', async (c, next) => {
  await next()
  const res = c.res
  const headers = new Headers(res.headers)
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  c.res = new Response(res.body, { status: res.status, statusText: res.statusText, headers })
})

/**
 * Popup relay page — posts a message to opener and closes itself.
 */
authRouter.get('/popup-done', (c) => {
  const status = c.req.query('status') || 'ok'
  const kind = c.req.query('kind') || 'login'
  const redirect = c.req.query('redirect') || '/'
  const error = c.req.query('error') || ''

  const safeJson = (v) =>
    JSON.stringify(v)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029')

  const payload = safeJson({ source: 'theme-electerm-auth', status, kind, redirect, error })
  const redirectJs = safeJson(redirect)

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Completing…</title>
<style>
  html,body{margin:0;height:100%;display:flex;align-items:center;justify-content:center;
    background:#0b0f17;color:#e5e7eb;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
  .w{display:flex;flex-direction:column;align-items:center;gap:14px}
  .s{width:34px;height:34px;border:3px solid rgba(255,255,255,.15);border-top-color:#1389FD;border-radius:50%;animation:sp .8s linear infinite}
  @keyframes sp{to{transform:rotate(360deg)}}
  p{margin:0;font-size:14px;opacity:.8}
</style>
</head>
<body>
<div class="w"><div class="s"></div><p>Completing…</p></div>
<script>
(function(){
  var payload = ${payload};
  try {
    if (window.opener && !window.opener.closed) {
      var isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
      var targetOrigin = isLocal ? '*' : window.location.origin;
      window.opener.postMessage(payload, targetOrigin);
    }
  } catch (e) {}
  setTimeout(function(){
    try { window.close(); } catch (e) {}
    if (!window.opener) { window.location.href = ${redirectJs}; }
  }, 150);
})();
</script>
</body>
</html>`

  return c.html(html)
})

/**
 * Get GitHub OAuth URL for login (popup flow).
 */
authRouter.get('/login-url', (c) => {
  const redirect = c.req.query('redirect') || '/'
  const state = crypto.randomUUID() + ':' + redirect
  const url = buildAuthUrl(c.env, state)
  const res = jsonResponse({ url })
  res.headers.append('Set-Cookie', oauthStateCookie(state, c.env.ENVIRONMENT === 'production'))
  return res
})

/**
 * Get GitHub OAuth URL for admin login.
 * Sets an extra cookie so the callback knows to enforce admin role and
 * redirect to /admin instead of /user.
 */
authRouter.get('/login-admin-url', (c) => {
  const state = crypto.randomUUID() + ':/admin'
  const url = buildAuthUrl(c.env, state)
  const secure = c.env.ENVIRONMENT === 'production'
  const res = jsonResponse({ url })
  res.headers.append('Set-Cookie', oauthStateCookie(state, secure))
  res.headers.append('Set-Cookie', adminLoginCookie(secure))
  return res
})

/**
 * GitHub OAuth callback handler.
 */
export async function githubLoginCallback (c) {
  const code = c.req.query('code')
  const state = c.req.query('state')
  const cookieState = readCookie(c.req.raw, OAUTH_STATE_COOKIE)
  const isAdminLogin = !!readCookie(c.req.raw, ADMIN_LOGIN_COOKIE)
  const base = siteUrl(c.env)
  const secure = c.env.ENVIRONMENT === 'production'
  const clearStateCookies = [clearOauthStateCookie(secure), clearAdminLoginCookie(secure)]

  // Extract redirect from state
  let redirect = '/'
  if (state && state.includes(':')) {
    redirect = state.split(':').slice(1).join(':') || '/'
  }
  if (cookieState && cookieState.includes(':')) {
    const cookieRedirect = cookieState.split(':').slice(1).join(':')
    if (cookieRedirect) redirect = cookieRedirect
  }

  if (!code || !state || !cookieState || state !== cookieState) {
    return redirectWithCookies(
      popupDoneUrl(base, { status: 'error', kind: 'login', redirect: isAdminLogin ? '/login-admin' : redirect, error: 'auth' }),
      clearStateCookies
    )
  }

  try {
    const token = await exchangeCode(c.env, code)
    const profile = await getUserInfo(token)
    const { identity } = await findOrCreateUser(c.env, profile)

    // Admin login flow — require admin role, then redirect to /admin
    if (isAdminLogin) {
      if (identity.role !== 'admin') {
        return redirectWithCookies(
          popupDoneUrl(base, { status: 'error', kind: 'login', redirect: '/login-admin', error: 'denied' }),
          clearStateCookies
        )
      }
      const session = await signSession(c.env, identity)
      return redirectWithCookies(
        popupDoneUrl(base, { status: 'ok', kind: 'login', redirect: '/admin' }),
        [sessionCookie(session, secure), ...clearStateCookies]
      )
    }

    const userRow = await getRow(c.env.DB, 'SELECT status FROM users WHERE id = ?', identity.id)
    if (userRow?.status === 'disabled') {
      return redirectWithCookies(
        popupDoneUrl(base, { status: 'error', kind: 'login', redirect, error: 'disabled' }),
        clearStateCookies
      )
    }

    const session = await signSession(c.env, identity)
    return redirectWithCookies(
      popupDoneUrl(base, { status: 'ok', kind: 'login', redirect }),
      [sessionCookie(session, secure), ...clearStateCookies]
    )
  } catch (e) {
    console.error('[auth] FAILED:', String(e))
    return redirectWithCookies(
      popupDoneUrl(base, { status: 'error', kind: 'login', redirect: isAdminLogin ? '/login-admin' : redirect, error: 'auth' }),
      clearStateCookies
    )
  }
}

/**
 * Logout.
 */
authRouter.get('/logout', (c) => {
  return redirectWithCookies(siteUrl(c.env) + '/', [
    sessionCookie(null, c.env.ENVIRONMENT === 'production')
  ])
})
