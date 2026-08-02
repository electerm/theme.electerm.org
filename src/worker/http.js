/**
 * HTTP utilities for the worker.
 */
import { customAlphabet } from 'nanoid'

const generateId = customAlphabet(
  '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
  10
)

export function siteUrl (env) {
  return (env.SITE_URL || 'https://theme.electerm.org').replace(/\/+$/, '')
}

export function redirectWithCookies (url, cookies) {
  const res = new Response(null, { status: 302, headers: { Location: url } })
  for (const c of cookies) res.headers.append('Set-Cookie', c)
  return res
}

/**
 * Build an absolute URL to the popup "done" relay page.
 */
export function popupDoneUrl (base, opts) {
  const params = new URLSearchParams({ status: opts.status, kind: opts.kind })
  if (opts.redirect) params.set('redirect', opts.redirect)
  if (opts.error) params.set('error', opts.error)
  return `${base}/api/auth/popup-done?${params.toString()}`
}

/**
 * Generate a random token string.
 */
export function generateToken () {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Generate a short random ID (nanoid, 10 chars).
 */
export { generateId }

/**
 * Parse "120y" into a future timestamp ISO string.
 */
export function expiryFromNow (str) {
  const match = /^(\d+)([ydmh])$/.exec(str)
  if (!match) {
    const d = new Date()
    d.setFullYear(d.getFullYear() + 120)
    return d.toISOString()
  }
  const num = parseInt(match[1], 10)
  const unit = match[2]
  const d = new Date()
  switch (unit) {
    case 'y': d.setFullYear(d.getFullYear() + num); break
    case 'd': d.setDate(d.getDate() + num); break
    case 'm': d.setMinutes(d.getMinutes() + num); break
    case 'h': d.setHours(d.getHours() + num); break
  }
  return d.toISOString()
}

/**
 * JSON response helper with no-cache headers.
 */
export function jsonResponse (data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    }
  })
}
