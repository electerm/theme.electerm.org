/**
 * Login page — GitHub OAuth popup login.
 */
import { loginWithPopup } from '../lib/auth.js'
import { toast } from '../lib/ui.js'
import { initHeader } from '../parts/header.js'
import { t } from '../parts/i18n-inline.js'

function init () {
  initHeader()

  // Check for error param
  const params = new URLSearchParams(window.location.search)
  const error = params.get('error')
  if (error) {
    const messages = {
      auth: t('toast.loginFailed'),
      disabled: 'Your account has been disabled.',
      denied: 'Access denied.'
    }
    toast(messages[error] || 'Login error', 'error')
  }

  document.getElementById('btn-github-login').addEventListener('click', async () => {
    const btn = document.getElementById('btn-github-login')
    btn.disabled = true
    btn.querySelector('span').textContent = t('page.signingIn')

    // Where to go after login. Defaults to the user profile, but the
    // editor (save flow) passes ?redirect=/ so we can return there.
    const redirect = new URLSearchParams(window.location.search).get('redirect') || '/user/'

    try {
      const user = await loginWithPopup(redirect)
      if (user) {
        toast(t('toast.signedInRedirect'), 'success')
        setTimeout(() => {
          window.location.href = redirect
        }, 500)
      }
    } catch (err) {
      toast(err.message || t('toast.loginFailed'), 'error')
      btn.disabled = false
      btn.querySelector('span').textContent = t('page.signInWithGitHub')
    }
  })
}

document.addEventListener('DOMContentLoaded', init)
