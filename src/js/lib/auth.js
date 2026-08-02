/**
 * Auth helper — popup-based GitHub login and user state management.
 */

import { apiGet } from './api.js'

let _currentUser = null
let _loginPromise = null

/**
 * Get current user info from API.
 */
export async function fetchUser () {
  try {
    const data = await apiGet('/me/')
    _currentUser = data.user
    return _currentUser
  } catch {
    _currentUser = null
    return null
  }
}

/**
 * Get cached current user.
 */
export function getCurrentUser () {
  return _currentUser
}

/**
 * Check if user is logged in.
 */
export function isLoggedIn () {
  return !!_currentUser
}

/**
 * Open GitHub login in a popup window.
 * Returns a promise that resolves when login is complete.
 */
export function loginWithPopup (redirect = '/') {
  if (_loginPromise) return _loginPromise

  _loginPromise = new Promise((resolve, reject) => {
    const width = 600
    const height = 700
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2

    let popup = null

    async function handleMessage (e) {
      const msg = e.data
      if (!msg || msg.source !== 'theme-electerm-auth') return

      window.removeEventListener('message', handleMessage)
      clearTimeout(timeout)
      _loginPromise = null

      if (msg.status === 'ok') {
        // Fetch updated user info
        await fetchUser()
        resolve(_currentUser)
      } else {
        reject(new Error(msg.error || 'Login failed'))
      }

      // Close popup if still open
      if (popup && !popup.closed) {
        try { popup.close() } catch {}
      }
    }

    window.addEventListener('message', handleMessage)

    // Timeout after 5 minutes
    const timeout = setTimeout(() => {
      window.removeEventListener('message', handleMessage)
      _loginPromise = null
      if (popup && !popup.closed) {
        try { popup.close() } catch {}
      }
      reject(new Error('Login timeout'))
    }, 5 * 60 * 1000)

    // Get OAuth URL and open popup
    fetch(`/api/auth/login-url?redirect=${encodeURIComponent(redirect)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.url) {
          _loginPromise = null
          reject(new Error('Failed to get login URL'))
          return
        }
        popup = window.open(data.url, 'github-login', `width=${width},height=${height},left=${left},top=${top}`)
        if (!popup) {
          _loginPromise = null
          reject(new Error('Popup blocked. Please allow popups for this site.'))
        }
      })
      .catch((err) => {
        _loginPromise = null
        reject(err)
      })
  })

  return _loginPromise
}

/**
 * Logout — redirects to logout endpoint.
 */
export function logout () {
  window.location.href = '/api/auth/logout'
}
