/**
 * Login page — GitHub OAuth login.
 *
 * This page is reached two ways:
 *  - directly (user visits /login): after login we redirect to `redirect`.
 *  - as a popup (opened by the editor's save/AI flows via loginWithPopup):
 *    we navigate THIS popup through GitHub OAuth; the popup-done relay then
 *    posts the result to the opener and closes itself.
 */
import { toast } from '../lib/ui.js'
import { initHeader } from '../parts/header.js'
import { t } from '../parts/i18n-inline.js'

function init () {
  initHeader()

  // The same login page script powers both /login (regular) and
  // /login-admin (admin). The admin variant uses a different OAuth
  // endpoint that enforces admin role and redirects to /admin.
  const isAdminLogin = window.location.pathname.includes('/login-admin')

  // Check for error param
  const params = new URLSearchParams(window.location.search)
  const error = params.get('error')
  if (error) {
    const messages = {
      auth: t('toast.loginFailed'),
      disabled: 'Your account has been disabled.',
      denied: isAdminLogin ? (t('page.errorDenied') || 'Access denied.') : 'Access denied.'
    }
    toast(messages[error] || 'Login error', 'error')
  }

  document.getElementById('btn-github-login').addEventListener('click', async () => {
    const btn = document.getElementById('btn-github-login')
    btn.disabled = true
    btn.querySelector('span').textContent = t('page.signingIn')

    // Where to go after login. When opened as a popup by the editor, this is
    // the editor URL; on a direct visit it defaults to the user profile
    // (or /admin for the admin login).
    const defaultRedirect = isAdminLogin ? '/admin' : '/user/'
    const redirect = new URLSearchParams(window.location.search).get('redirect') || defaultRedirect
    const apiUrl = isAdminLogin ? '/api/auth/login-admin-url' : '/api/auth/login-url'

    try {
      // Fetch the OAuth URL (also sets the state cookie) and navigate THIS
      // window to GitHub. In a popup the relay posts back to the opener; on
      // a direct visit it redirects to `redirect`.
      const r = await fetch(`${apiUrl}?redirect=${encodeURIComponent(redirect)}`)
      const data = await r.json()
      if (!data.url) throw new Error('Failed to get login URL')
      window.location.href = data.url
    } catch (err) {
      toast(err.message || t('toast.loginFailed'), 'error')
      btn.disabled = false
      btn.querySelector('span').textContent = t('page.signInWithGitHub')
    }
  })
}

document.addEventListener('DOMContentLoaded', init)
