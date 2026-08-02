/**
 * Shared worker types.
 */

export const SESSION_COOKIE = 'theme_electerm_session'
export const OAUTH_STATE_COOKIE = 'theme_electerm_oauth_state'
export const ADMIN_LOGIN_COOKIE = 'theme_electerm_admin_login'

export function isSecure (env) {
  return env.ENVIRONMENT === 'production'
}

export function readCookie (req, name) {
  const header = req.headers.get('cookie')
  if (!header) return null
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    const k = part.slice(0, idx).trim()
    const v = part.slice(idx + 1).trim()
    if (k === name) return decodeURIComponent(v)
  }
  return null
}
