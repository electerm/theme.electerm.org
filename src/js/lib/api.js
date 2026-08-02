/**
 * API helper — wraps fetch with JSON parsing and error handling.
 */

export async function api (path, options = {}) {
  const opts = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    credentials: 'same-origin'
  }

  if (opts.body && typeof opts.body === 'object') {
    opts.body = JSON.stringify(opts.body)
  }

  const res = await fetch('/api' + path, opts)
  const data = await res.json().catch(() => ({ error: 'Invalid JSON response' }))

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`)
  }

  return data
}

export async function apiGet (path) {
  return api(path, { method: 'GET' })
}

export async function apiPost (path, body) {
  return api(path, { method: 'POST', body })
}

export async function apiPut (path, body) {
  return api(path, { method: 'PUT', body })
}

export async function apiDelete (path) {
  return api(path, { method: 'DELETE' })
}
