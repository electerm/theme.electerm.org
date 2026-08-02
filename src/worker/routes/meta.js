/**
 * /api/meta — site-level statistics.
 */
import { Hono } from 'hono'
import { jsonResponse } from '../http.js'

export const metaRouter = new Hono()

/**
 * Get all meta info (total themes, users, likes, public theme ids).
 */
metaRouter.get('/', async (c) => {
  const rows = await c.env.DB.prepare('SELECT key, value FROM meta').all()
  const meta = {}
  for (const row of rows.results || []) {
    if (row.key === 'public_theme_ids') {
      try { meta[row.key] = JSON.parse(row.value) } catch { meta[row.key] = [] }
    } else {
      meta[row.key] = row.value
    }
  }
  return jsonResponse({ meta })
})
