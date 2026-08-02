/**
 * Session management using JWT (jose library).
 */
import { SignJWT, jwtVerify } from 'jose'
import { SESSION_COOKIE, OAUTH_STATE_COOKIE, readCookie } from '../types.js'

const MAX_AGE = 60 * 60 * 24 * 30 // 30 days

function secret (env) {
  return new TextEncoder().encode(env.SERVER_SECRET || env.SESSION_SECRET || 'fallback-secret-change-me')
}

export async function signSession (env, identity) {
  return new SignJWT({
    id: identity.id,
    email: identity.email,
    name: identity.name,
    avatarUrl: identity.avatarUrl,
    role: identity.role || 'user',
    githubHandle: identity.githubHandle
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret(env))
}

export async function verifySession (env, token) {
  try {
    const { payload } = await jwtVerify(token, secret(env))
    return {
      id: String(payload.id),
      email: payload.email ?? null,
      name: payload.name ?? null,
      avatarUrl: payload.avatarUrl ?? null,
      role: payload.role ?? 'user',
      githubHandle: payload.githubHandle ?? null
    }
  } catch {
    return null
  }
}

export function sessionCookie (token, secure) {
  const flags = `Path=/; HttpOnly; SameSite=Lax; Max-Age=${token === null ? 0 : MAX_AGE}${secure ? '; Secure' : ''}`
  return `${SESSION_COOKIE}=${token === null ? '' : encodeURIComponent(token)}; ${flags}`
}

export function oauthStateCookie (token, secure) {
  const flags = `Path=/; HttpOnly; SameSite=Lax; Max-Age=600${secure ? '; Secure' : ''}`
  return `${OAUTH_STATE_COOKIE}=${token}; ${flags}`
}

export function clearOauthStateCookie (secure) {
  const flags = `Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`
  return `${OAUTH_STATE_COOKIE}=; ${flags}`
}

export { SESSION_COOKIE, OAUTH_STATE_COOKIE, readCookie }
