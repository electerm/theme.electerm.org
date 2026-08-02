/**
 * Auth middleware — verify session cookie and attach user to context.
 */
import { verifySession, readCookie, SESSION_COOKIE } from '../auth/session.js'
import { getRow } from '../db.js'
import { jsonResponse } from '../http.js'

export async function requireAuth (c, next) {
  const token = readCookie(c.req.raw, SESSION_COOKIE)
  if (!token) return jsonResponse({ error: 'Unauthorized' }, 401)
  const identity = await verifySession(c.env, token)
  if (!identity) return jsonResponse({ error: 'Unauthorized' }, 401)

  const user = await getRow(c.env.DB, 'SELECT * FROM users WHERE id = ?', identity.id)
  if (!user || user.status === 'disabled') {
    return jsonResponse({ error: 'Account disabled' }, 403)
  }

  c.set('user', user)
  c.set('identity', identity)
  await next()
}

/**
 * Optional auth — attach user if logged in, but don't block.
 */
export async function optionalAuth (c, next) {
  const token = readCookie(c.req.raw, SESSION_COOKIE)
  if (token) {
    const identity = await verifySession(c.env, token)
    if (identity) {
      const user = await getRow(c.env.DB, 'SELECT * FROM users WHERE id = ?', identity.id)
      if (user && user.status !== 'disabled') {
        c.set('user', user)
        c.set('identity', identity)
      }
    }
  }
  await next()
}
