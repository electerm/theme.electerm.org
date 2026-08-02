/**
 * GitHub OAuth helpers.
 */
import { getRow, runStmt } from '../db.js'
import { generateId } from '../http.js'

/**
 * Build the GitHub OAuth authorization URL.
 */
export function buildAuthUrl (env, state) {
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: env.GITHUB_CALLBACK_URL,
    scope: 'read:user user:email',
    state
  })
  return `https://github.com/login/oauth/authorize?${params.toString()}`
}

/**
 * Exchange the OAuth code for an access token.
 */
export async function exchangeCode (env, code) {
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: env.GITHUB_CALLBACK_URL
    })
  })
  const data = await res.json()
  if (!data.access_token) {
    throw new Error('No access_token in GitHub response')
  }
  return data.access_token
}

/**
 * Get GitHub user profile.
 */
export async function getUserInfo (accessToken) {
  const res = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'theme.electerm.org'
    }
  })
  if (!res.ok) throw new Error('Failed to fetch GitHub user')
  const profile = await res.json()

  let email = profile.email
  if (!email) {
    const emailRes = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'theme.electerm.org'
      }
    })
    if (emailRes.ok) {
      const emails = await emailRes.json()
      const primary = emails.find((e) => e.primary)
      email = primary?.email || emails[0]?.email || null
    }
  }

  return {
    githubId: String(profile.id),
    githubHandle: profile.login,
    name: profile.name || profile.login,
    email,
    avatarUrl: profile.avatar_url
  }
}

/**
 * Find or create a user from GitHub profile.
 */
export async function findOrCreateUser (env, profile) {
  const adminHandles = (env.ADMIN_GITHUB_HANDLES || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
  const isAdmin = adminHandles.includes(profile.githubHandle.toLowerCase())

  let user = await getRow(
    env.DB,
    'SELECT * FROM users WHERE github_id = ?',
    profile.githubId
  )

  if (user) {
    await runStmt(
      env.DB,
      'UPDATE users SET name = ?, email = ?, avatar_url = ?, github_handle = ?, role = ?, updated_at = strftime(\'%Y-%m-%dT%H:%M:%SZ\', \'now\') WHERE id = ?',
      profile.name,
      profile.email,
      profile.avatarUrl,
      profile.githubHandle,
      isAdmin ? 'admin' : user.role,
      user.id
    )
    user = await getRow(env.DB, 'SELECT * FROM users WHERE id = ?', user.id)
  } else {
    const userId = generateId()
    await runStmt(
      env.DB,
      'INSERT INTO users (id, github_id, github_handle, name, email, avatar_url, role, status) VALUES (?, ?, ?, ?, ?, ?, ?, \'active\')',
      userId,
      profile.githubId,
      profile.githubHandle,
      profile.name,
      profile.email,
      profile.avatarUrl,
      isAdmin ? 'admin' : 'user'
    )
    // Update total_users meta
    await incrementMeta(env, 'total_users', 1)
    user = await getRow(env.DB, 'SELECT * FROM users WHERE id = ?', userId)
  }

  return {
    identity: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatar_url,
      role: user.role,
      githubHandle: user.github_handle
    },
    user
  }
}

/**
 * Increment a meta counter.
 */
async function incrementMeta (env, key, delta) {
  const row = await getRow(env.DB, 'SELECT value FROM meta WHERE key = ?', key)
  const current = parseInt(row?.value || '0', 10)
  const newVal = current + delta
  await runStmt(
    env.DB,
    'UPDATE meta SET value = ?, updated_at = strftime(\'%Y-%m-%dT%H:%M:%SZ\', \'now\') WHERE key = ?',
    String(newVal),
    key
  )
}
