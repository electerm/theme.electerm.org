/**
 * /api/themes — theme CRUD, like/unlike, publish, list.
 */
import { Hono } from 'hono'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import { getRow, allRows, runStmt } from '../db.js'
import { generateId, jsonResponse } from '../http.js'

export const themesRouter = new Hono()

const MAX_THEMES_PER_USER = 10

/**
 * Parse JSON safely.
 */
function safeParse (str, fallback) {
  try {
    return JSON.parse(str) || fallback
  } catch {
    return fallback
  }
}

/**
 * Serialize a theme row for API response.
 */
function serializeTheme (row, currentUserId) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    themeConfig: safeParse(row.theme_config, {}),
    uiThemeConfig: safeParse(row.ui_theme_config, {}),
    isPublic: row.is_public === 1,
    likeCount: row.like_count || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isOwner: currentUserId && row.user_id === currentUserId
  }
}

/**
 * Update public_theme_ids in meta table.
 */
async function rebuildPublicThemeIds (env) {
  const rows = await allRows(env.DB, 'SELECT id FROM themes WHERE is_public = 1 ORDER BY created_at DESC')
  const ids = rows.map((r) => r.id)
  await runStmt(
    env.DB,
    'UPDATE meta SET value = ?, updated_at = strftime(\'%Y-%m-%dT%H:%M:%SZ\', \'now\') WHERE key = \'public_theme_ids\'',
    JSON.stringify(ids)
  )
}

/**
 * Increment/decrement a meta counter.
 */
async function adjustMeta (env, key, delta) {
  const row = await getRow(env.DB, 'SELECT value FROM meta WHERE key = ?', key)
  const current = parseInt(row?.value || '0', 10)
  await runStmt(
    env.DB,
    'UPDATE meta SET value = ?, updated_at = strftime(\'%Y-%m-%dT%H:%M:%SZ\', \'now\') WHERE key = ?',
    String(Math.max(0, current + delta)),
    key
  )
}

// ── Create theme ──────────────────────────────────────────────
themesRouter.post('/', requireAuth, async (c) => {
  const user = c.get('user')
  const body = await c.req.json()

  const { name, themeConfig, uiThemeConfig } = body

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return jsonResponse({ error: 'Theme name is required' }, 400)
  }
  if (name.length > 50) {
    return jsonResponse({ error: 'Theme name too long (max 50 chars)' }, 400)
  }

  // Check theme count limit
  const themeIds = safeParse(user.theme_ids, [])
  if (themeIds.length >= MAX_THEMES_PER_USER) {
    return jsonResponse({ error: `Maximum ${MAX_THEMES_PER_USER} themes per user` }, 403)
  }

  const themeId = generateId()
  const tc = JSON.stringify(themeConfig || {})
  const uc = JSON.stringify(uiThemeConfig || {})

  await runStmt(
    c.env.DB,
    'INSERT INTO themes (id, user_id, name, theme_config, ui_theme_config, is_public, like_count) VALUES (?, ?, ?, ?, ?, 0, 0)',
    themeId, user.id, name.trim(), tc, uc
  )

  // Add to user's theme_ids
  themeIds.push(themeId)
  await runStmt(
    c.env.DB,
    'UPDATE users SET theme_ids = ?, updated_at = strftime(\'%Y-%m-%dT%H:%M:%SZ\', \'now\') WHERE id = ?',
    JSON.stringify(themeIds), user.id
  )

  // Update total_themes meta
  await adjustMeta(c.env, 'total_themes', 1)

  const row = await getRow(c.env.DB, 'SELECT * FROM themes WHERE id = ?', themeId)
  return jsonResponse({ theme: serializeTheme(row, user.id) })
})

// ── Update theme ──────────────────────────────────────────────
themesRouter.put('/:id', requireAuth, async (c) => {
  const user = c.get('user')
  const themeId = c.req.param('id')
  const body = await c.req.json()

  const row = await getRow(c.env.DB, 'SELECT * FROM themes WHERE id = ?', themeId)
  if (!row) return jsonResponse({ error: 'Theme not found' }, 404)
  if (row.user_id !== user.id) return jsonResponse({ error: 'Not your theme' }, 403)

  const updates = []
  const params = []

  if (body.name !== undefined) {
    if (!body.name || body.name.trim().length === 0) {
      return jsonResponse({ error: 'Theme name cannot be empty' }, 400)
    }
    updates.push('name = ?')
    params.push(body.name.trim().slice(0, 50))
  }
  if (body.themeConfig !== undefined) {
    updates.push('theme_config = ?')
    params.push(JSON.stringify(body.themeConfig))
  }
  if (body.uiThemeConfig !== undefined) {
    updates.push('ui_theme_config = ?')
    params.push(JSON.stringify(body.uiThemeConfig))
  }

  if (updates.length === 0) {
    return jsonResponse({ error: 'No fields to update' }, 400)
  }

  updates.push("updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')")
  params.push(themeId)

  await runStmt(c.env.DB, `UPDATE themes SET ${updates.join(', ')} WHERE id = ?`, ...params)

  const updated = await getRow(c.env.DB, 'SELECT * FROM themes WHERE id = ?', themeId)
  return jsonResponse({ theme: serializeTheme(updated, user.id) })
})

// ── Delete theme ──────────────────────────────────────────────
themesRouter.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user')
  const themeId = c.req.param('id')

  const row = await getRow(c.env.DB, 'SELECT * FROM themes WHERE id = ?', themeId)
  if (!row) return jsonResponse({ error: 'Theme not found' }, 404)
  if (row.user_id !== user.id) return jsonResponse({ error: 'Not your theme' }, 403)

  await runStmt(c.env.DB, 'DELETE FROM themes WHERE id = ?', themeId)

  // Remove from user's theme_ids
  const themeIds = safeParse(user.theme_ids, []).filter((id) => id !== themeId)
  await runStmt(
    c.env.DB,
    'UPDATE users SET theme_ids = ?, updated_at = strftime(\'%Y-%m-%dT%H:%M:%SZ\', \'now\') WHERE id = ?',
    JSON.stringify(themeIds), user.id
  )

  // If was public, rebuild public list and adjust meta
  if (row.is_public === 1) {
    await rebuildPublicThemeIds(c.env)
  }
  // Adjust total_themes
  await adjustMeta(c.env, 'total_themes', -1)
  // If had likes, adjust total_likes
  if (row.like_count > 0) {
    await adjustMeta(c.env, 'total_likes', -row.like_count)
  }

  // Remove from all users' liked_theme_ids
  const likers = await allRows(c.env.DB, 'SELECT id, liked_theme_ids FROM users WHERE liked_theme_ids LIKE ?', `%${themeId}%`)
  for (const liker of likers) {
    const liked = safeParse(liker.liked_theme_ids, []).filter((id) => id !== themeId)
    await runStmt(
      c.env.DB,
      'UPDATE users SET liked_theme_ids = ?, liked_themes_count = ?, updated_at = strftime(\'%Y-%m-%dT%H:%M:%SZ\', \'now\') WHERE id = ?',
      JSON.stringify(liked), liked.length, liker.id
    )
  }

  return jsonResponse({ ok: true })
})

// ── List user's themes (must be before /:id) ────────────────
themesRouter.get('/user/mine', requireAuth, async (c) => {
  const user = c.get('user')
  const rows = await allRows(c.env.DB, 'SELECT * FROM themes WHERE user_id = ? ORDER BY created_at DESC', user.id)
  const themes = rows.map((row) => serializeTheme(row, user.id))
  return jsonResponse({ themes })
})

// ── Get single theme ──────────────────────────────────────────
themesRouter.get('/:id', optionalAuth, async (c) => {
  const themeId = c.req.param('id')
  const user = c.get('user')

  const row = await getRow(c.env.DB, 'SELECT * FROM themes WHERE id = ?', themeId)
  if (!row) return jsonResponse({ error: 'Theme not found' }, 404)

  // If not public and not owner, deny
  if (row.is_public !== 1 && (!user || row.user_id !== user.id)) {
    return jsonResponse({ error: 'Theme not found' }, 404)
  }

  // Get owner info
  const owner = await getRow(c.env.DB, 'SELECT name, github_handle, avatar_url FROM users WHERE id = ?', row.user_id)

  const theme = serializeTheme(row, user?.id)
  theme.owner = owner
    ? {
        name: owner.name,
        githubHandle: owner.github_handle,
        avatarUrl: owner.avatar_url
      }
    : null

  // Check if current user liked it
  if (user) {
    const likedIds = safeParse(user.liked_theme_ids, [])
    theme.isLiked = likedIds.includes(themeId)
  } else {
    theme.isLiked = false
  }

  return jsonResponse({ theme })
})

// ── List public themes ────────────────────────────────────────
themesRouter.get('/', optionalAuth, async (c) => {
  const limit = Math.min(parseInt(c.req.query('limit') || '24', 10), 100)
  const offset = parseInt(c.req.query('offset') || '0', 10)
  const sort = c.req.query('sort') || 'newest' // newest | popular

  const orderBy = sort === 'popular' ? 'like_count DESC, created_at DESC' : 'created_at DESC'

  const rows = await allRows(
    c.env.DB,
    `SELECT * FROM themes WHERE is_public = 1 ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    limit, offset
  )

  const user = c.get('user')
  const likedIds = user ? safeParse(user.liked_theme_ids, []) : []

  // Fetch owner profiles (name/handle/avatar) for all returned themes in
  // a single query, so the public gallery can show each theme's author.
  const userIds = [...new Set(rows.map((r) => r.user_id))]
  const ownerMap = {}
  if (userIds.length) {
    const placeholders = userIds.map(() => '?').join(',')
    const ownerRows = await allRows(
      c.env.DB,
      `SELECT id, name, github_handle, avatar_url FROM users WHERE id IN (${placeholders})`,
      ...userIds
    )
    for (const o of ownerRows) {
      ownerMap[o.id] = {
        name: o.name,
        githubHandle: o.github_handle,
        avatarUrl: o.avatar_url
      }
    }
  }

  const themes = rows.map((row) => {
    const t = serializeTheme(row, user?.id)
    t.isLiked = likedIds.includes(row.id)
    t.owner = ownerMap[row.user_id] || null
    return t
  })

  // Get total count
  const countRow = await getRow(c.env.DB, 'SELECT COUNT(*) as count FROM themes WHERE is_public = 1')

  return jsonResponse({
    themes,
    total: countRow?.count || 0,
    limit,
    offset
  })
})

// ── Publish / unpublish theme ─────────────────────────────────
themesRouter.post('/:id/publish', requireAuth, async (c) => {
  const user = c.get('user')
  const themeId = c.req.param('id')

  const row = await getRow(c.env.DB, 'SELECT * FROM themes WHERE id = ?', themeId)
  if (!row) return jsonResponse({ error: 'Theme not found' }, 404)
  if (row.user_id !== user.id) return jsonResponse({ error: 'Not your theme' }, 403)

  const newPublic = row.is_public === 1 ? 0 : 1
  await runStmt(
    c.env.DB,
    'UPDATE themes SET is_public = ?, updated_at = strftime(\'%Y-%m-%dT%H:%M:%SZ\', \'now\') WHERE id = ?',
    newPublic, themeId
  )

  await rebuildPublicThemeIds(c.env)

  const updated = await getRow(c.env.DB, 'SELECT * FROM themes WHERE id = ?', themeId)
  return jsonResponse({ theme: serializeTheme(updated, user.id) })
})

// ── Like / unlike theme ───────────────────────────────────────
themesRouter.post('/:id/like', requireAuth, async (c) => {
  const user = c.get('user')
  const themeId = c.req.param('id')

  const row = await getRow(c.env.DB, 'SELECT * FROM themes WHERE id = ?', themeId)
  if (!row) return jsonResponse({ error: 'Theme not found' }, 404)

  const likedIds = safeParse(user.liked_theme_ids, [])
  const isLiked = likedIds.includes(themeId)

  if (isLiked) {
    // Unlike
    const newLiked = likedIds.filter((id) => id !== themeId)
    await runStmt(
      c.env.DB,
      'UPDATE users SET liked_theme_ids = ?, liked_themes_count = ?, updated_at = strftime(\'%Y-%m-%dT%H:%M:%SZ\', \'now\') WHERE id = ?',
      JSON.stringify(newLiked), newLiked.length, user.id
    )
    await runStmt(
      c.env.DB,
      'UPDATE themes SET like_count = MAX(0, like_count - 1), updated_at = strftime(\'%Y-%m-%dT%H:%M:%SZ\', \'now\') WHERE id = ?',
      themeId
    )
    await adjustMeta(c.env, 'total_likes', -1)
  } else {
    // Like
    likedIds.push(themeId)
    await runStmt(
      c.env.DB,
      'UPDATE users SET liked_theme_ids = ?, liked_themes_count = ?, updated_at = strftime(\'%Y-%m-%dT%H:%M:%SZ\', \'now\') WHERE id = ?',
      JSON.stringify(likedIds), likedIds.length, user.id
    )
    await runStmt(
      c.env.DB,
      'UPDATE themes SET like_count = like_count + 1, updated_at = strftime(\'%Y-%m-%dT%H:%M:%SZ\', \'now\') WHERE id = ?',
      themeId
    )
    await adjustMeta(c.env, 'total_likes', 1)
  }

  const updated = await getRow(c.env.DB, 'SELECT * FROM themes WHERE id = ?', themeId)
  return jsonResponse({
    theme: serializeTheme(updated, user.id),
    isLiked: !isLiked,
    likeCount: updated.like_count
  })
})
