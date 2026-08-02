/**
 * /api/admin — admin management routes.
 * Protected by admin session middleware (mirrors requireAuth + role check).
 */
import { Hono } from 'hono'
import { verifySession, readCookie, SESSION_COOKIE } from '../auth/session.js'
import { getRow, allRows, runStmt } from '../db.js'
import { jsonResponse } from '../http.js'

export const adminRouter = new Hono()

/**
 * Admin auth middleware — session must belong to an active admin.
 */
adminRouter.use('*', async (c, next) => {
  const token = readCookie(c.req.raw, SESSION_COOKIE)
  if (!token) return jsonResponse({ error: 'Unauthorized' }, 401)
  const identity = await verifySession(c.env, token)
  if (!identity) return jsonResponse({ error: 'Unauthorized' }, 401)

  const user = await getRow(c.env.DB, 'SELECT * FROM users WHERE id = ?', identity.id)
  if (!user || user.status === 'disabled' || user.role !== 'admin') {
    return jsonResponse({ error: 'Admin access required' }, 403)
  }

  c.set('admin', user)
  await next()
})

// ── Stats ─────────────────────────────────────────────────────────

adminRouter.get('/stats', async (c) => {
  // Count directly from tables for accuracy (meta counters may drift).
  const users = await getRow(c.env.DB, 'SELECT COUNT(*) as count FROM users')
  const themes = await getRow(c.env.DB, 'SELECT COUNT(*) as count FROM themes')
  const publicThemes = await getRow(c.env.DB, 'SELECT COUNT(*) as count FROM themes WHERE is_public = 1')
  const likes = await getRow(c.env.DB, 'SELECT COALESCE(SUM(like_count), 0) as count FROM themes')

  return jsonResponse({
    stats: {
      totalUsers: users?.count || 0,
      totalThemes: themes?.count || 0,
      publicThemes: publicThemes?.count || 0,
      totalLikes: likes?.count || 0
    }
  })
})

// ── Users ─────────────────────────────────────────────────────────

adminRouter.get('/users', async (c) => {
  const users = await allRows(
    c.env.DB,
    `SELECT id, github_handle, name, email, avatar_url, role, status,
            json_array_length(theme_ids) AS theme_count,
            liked_themes_count,
            created_at
     FROM users ORDER BY created_at DESC`
  )
  return jsonResponse({ users })
})

adminRouter.put('/users/:id/status', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const status = body.status === 'disabled' ? 'disabled' : 'active'
  await runStmt(
    c.env.DB,
    "UPDATE users SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?",
    status,
    id
  )
  return jsonResponse({ success: true })
})

adminRouter.delete('/users/:id', async (c) => {
  const id = c.req.param('id')
  const admin = c.get('admin')
  if (id === admin.id) {
    return jsonResponse({ error: 'Cannot delete yourself' }, 400)
  }

  // Cascade delete the user's themes (no FK constraints — app-level cleanup).
  await runStmt(c.env.DB, 'DELETE FROM themes WHERE user_id = ?', id)
  await runStmt(c.env.DB, 'DELETE FROM users WHERE id = ?', id)

  // Refresh aggregate counters so the dashboard stays consistent.
  await refreshStats(c.env)

  return jsonResponse({ success: true })
})

// ── Themes ────────────────────────────────────────────────────────

adminRouter.get('/themes', async (c) => {
  const themes = await allRows(
    c.env.DB,
    `SELECT t.id, t.name, t.user_id, t.is_public, t.like_count, t.created_at,
            u.name AS author_name, u.github_handle AS author_handle
     FROM themes t
     LEFT JOIN users u ON t.user_id = u.id
     ORDER BY t.created_at DESC`
  )
  return jsonResponse({ themes })
})

// ── Helpers ───────────────────────────────────────────────────────

/**
 * Recompute total_* meta counters from the live tables.
 */
async function refreshStats (env) {
  const users = await getRow(env.DB, 'SELECT COUNT(*) as count FROM users')
  const themes = await getRow(env.DB, 'SELECT COUNT(*) as count FROM themes')
  const likes = await getRow(env.DB, 'SELECT COALESCE(SUM(like_count), 0) as count FROM themes')
  const updates = [
    ['total_users', String(users?.count || 0)],
    ['total_themes', String(themes?.count || 0)],
    ['total_likes', String(likes?.count || 0)]
  ]
  for (const [key, value] of updates) {
    await runStmt(
      env.DB,
      "UPDATE meta SET value = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE key = ?",
      value,
      key
    )
  }
}
