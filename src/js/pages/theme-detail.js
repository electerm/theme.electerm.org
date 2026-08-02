/**
 * Theme detail page — view, like, copy, edit, share a theme.
 */
import { apiGet, apiPost } from '../lib/api.js'
import { initIframeControl, applyTheme } from '../lib/iframe-control.js'
import { convertThemeToText } from '../lib/theme.js'
import { isLoggedIn, loginWithPopup } from '../lib/auth.js'
import { toast, copyToClipboard, shareTo } from '../lib/ui.js'
import { initHeader } from '../parts/header.js'
import { t } from '../parts/i18n-inline.js'

let currentTheme = null

function init () {
  initHeader()

  // Get theme ID from URL
  const pathParts = window.location.pathname.split('/').filter(Boolean)
  const themeId = pathParts.length >= 2 ? pathParts[1] : null

  if (!themeId) {
    document.getElementById('detail-loading').textContent = t('page.notFound')
    return
  }

  loadTheme(themeId)
}

async function loadTheme (themeId) {
  try {
    const data = await apiGet(`/themes/${themeId}`)
    currentTheme = data.theme

    document.getElementById('detail-loading').style.display = 'none'
    document.getElementById('detail-content').style.display = ''

    // Render header
    document.getElementById('detail-name').textContent = currentTheme.name

    if (currentTheme.owner) {
      document.getElementById('detail-owner-avatar').src = currentTheme.owner.avatarUrl || ''
      document.getElementById('detail-owner-name').textContent = currentTheme.owner.name || currentTheme.owner.githubHandle || ''
    }

    document.getElementById('detail-like-count').textContent = currentTheme.likeCount || 0

    // Like button
    const likeBtn = document.getElementById('btn-like')
    if (currentTheme.isLiked) {
      likeBtn.textContent = t('page.unlike')
      likeBtn.classList.add('btn-secondary')
      likeBtn.classList.remove('btn-primary')
    }
    likeBtn.addEventListener('click', handleLike)

    // Copy config
    document.getElementById('btn-copy').addEventListener('click', () => {
      const text = convertThemeToText(currentTheme, true)
      copyToClipboard(text).then((ok) => {
        toast(ok ? t('toast.configCopied') : t('toast.copyFailed'), ok ? 'success' : 'error')
      })
    })

    // Download theme
    document.getElementById('btn-download').addEventListener('click', () => {
      const text = convertThemeToText(currentTheme, true)
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${(currentTheme.name || 'theme').replace(/[^\w-]+/g, '_')}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast(t('toast.themeDownloaded'), 'success')
    })

    // Edit
    document.getElementById('btn-edit').addEventListener('click', () => {
      const importData = encodeURIComponent(JSON.stringify({
        name: currentTheme.name,
        themeConfig: currentTheme.themeConfig,
        uiThemeConfig: currentTheme.uiThemeConfig
      }))
      window.location.href = `/?import=${importData}`
    })

    // Share buttons
    const shareUrl = window.location.href
    const shareText = `Check out this electerm theme: ${currentTheme.name}`

    document.getElementById('btn-share-twitter').addEventListener('click', () => {
      shareTo('twitter', shareUrl, shareText)
    })
    document.getElementById('btn-share-facebook').addEventListener('click', () => {
      shareTo('facebook', shareUrl, shareText)
    })

    // Config text
    document.getElementById('detail-config-text').textContent = convertThemeToText(currentTheme, true)

    // Init iframe preview
    const frame = document.getElementById('detail-demo-frame')
    const demoUrl = document.body.dataset.demoUrl || 'https://demo.electerm.org?showThemeColor=1'
    frame.src = demoUrl

    initIframeControl(frame, () => {
      applyTheme(currentTheme.themeConfig, currentTheme.uiThemeConfig)
    })
  } catch (err) {
    document.getElementById('detail-loading').textContent = `${t('page.failed')}: ${err.message}`
  }
}

async function handleLike () {
  if (!isLoggedIn()) {
    try {
      toast(t('toast.signInToLike'))
      await loginWithPopup(window.location.pathname)
      toast(t('toast.signedIn'), 'success')
    } catch (err) {
      toast(err.message || t('toast.loginFailed'), 'error')
      return
    }
  }

  try {
    const data = await apiPost(`/themes/${currentTheme.id}/like`)
    currentTheme.isLiked = data.isLiked
    document.getElementById('detail-like-count').textContent = data.likeCount

    const btn = document.getElementById('btn-like')
    if (data.isLiked) {
      btn.textContent = t('page.unlike')
      btn.classList.add('btn-secondary')
      btn.classList.remove('btn-primary')
    } else {
      btn.textContent = t('page.like')
      btn.classList.add('btn-primary')
      btn.classList.remove('btn-secondary')
    }
  } catch (err) {
    toast(err.message || 'Failed to like', 'error')
  }
}

document.addEventListener('DOMContentLoaded', init)
