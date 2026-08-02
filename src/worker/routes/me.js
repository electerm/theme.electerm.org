/**
 * /api/me — user profile and theme management.
 */
import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth.js'
import { allRows } from '../db.js'
import { jsonResponse } from '../http.js'

export const meRouter = new Hono()

meRouter.use('*', requireAuth)

/**
 * Get current user profile.
 */
meRouter.get('/', async (c) => {
  const user = c.get('user')

  // Get user's themes
  const themeIds = safeJsonArray(user.theme_ids)
  const themes = await allRows(c.env.DB, 'SELECT id, name, theme_config, ui_theme_config, is_public, like_count, created_at, updated_at FROM themes WHERE user_id = ? ORDER BY created_at DESC', user.id)

  // Get liked themes
  const likedIds = safeJsonArray(user.liked_theme_ids)
  let likedThemes = []
  if (likedIds.length > 0) {
    const placeholders = likedIds.map(() => '?').join(',')
    likedThemes = await allRows(c.env.DB, `SELECT t.*, u.name as owner_name, u.github_handle as owner_handle, u.avatar_url as owner_avatar FROM themes t JOIN users u ON t.user_id = u.id WHERE t.id IN (${placeholders})`, ...likedIds)
  }

  return jsonResponse({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatar_url,
      role: user.role,
      status: user.status,
      githubHandle: user.github_handle,
      themeCount: themeIds.length,
      likedThemesCount: user.liked_themes_count || 0,
      createdAt: user.created_at
    },
    themes: themes.map((t) => ({
      id: t.id,
      name: t.name,
      themeConfig: safeJson(t.theme_config, {}),
      uiThemeConfig: safeJson(t.ui_theme_config, {}),
      isPublic: t.is_public === 1,
      likeCount: t.like_count || 0,
      createdAt: t.created_at,
      updatedAt: t.updated_at
    })),
    likedThemes: likedThemes.map((t) => ({
      id: t.id,
      name: t.name,
      themeConfig: safeJson(t.theme_config, {}),
      uiThemeConfig: safeJson(t.ui_theme_config, {}),
      isPublic: t.is_public === 1,
      likeCount: t.like_count || 0,
      owner: {
        name: t.owner_name,
        githubHandle: t.owner_handle,
        avatarUrl: t.owner_avatar
      }
    }))
  })
})

function safeJson (str, fallback) {
  try { return JSON.parse(str) || fallback } catch { return fallback }
}

function safeJsonArray (str) {
  try { return JSON.parse(str) || [] } catch { return [] }
}
