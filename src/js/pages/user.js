/**
 * User page — show user info, owned themes, and liked themes.
 */
import { apiGet, apiPost } from '../lib/api.js'
import { convertThemeToText } from '../lib/theme.js'
import { toast, copyToClipboard, buildPreviewSwatches } from '../lib/ui.js'
import { logout } from '../lib/auth.js'
import { initHeader } from '../parts/header.js'
import { t } from '../parts/i18n-inline.js'

function init () {
  initHeader()
  loadUserData()

  document.getElementById('btn-logout').addEventListener('click', logout)
}

async function loadUserData () {
  try {
    const data = await apiGet('/me/')
    const user = data.user

    document.getElementById('user-loading').style.display = 'none'
    document.getElementById('user-content').style.display = ''

    // Render user header
    document.getElementById('user-avatar').src = user.avatarUrl || ''
    document.getElementById('user-name').textContent = user.name || user.githubHandle || 'User'

    const githubLink = document.getElementById('user-github')
    if (user.githubHandle) {
      githubLink.href = `https://github.com/${user.githubHandle}`
      githubLink.textContent = `@${user.githubHandle}`
    }

    document.getElementById('user-theme-count').textContent = `${user.themeCount || 0} ${t('page.myThemes')}`
    document.getElementById('user-liked-count').textContent = `${user.likedThemesCount || 0} ${t('page.likedThemes')}`

    // Render owned themes
    const themesContainer = document.getElementById('user-themes')
    if (data.themes && data.themes.length > 0) {
      themesContainer.innerHTML = ''
      for (const theme of data.themes) {
        themesContainer.appendChild(buildThemeItem(theme, true))
      }
    } else {
      themesContainer.innerHTML = `<div class="empty-state">${t('page.noThemes')} <a href="/">${t('page.createOne')}</a></div>`
    }

    // Render liked themes
    const likedContainer = document.getElementById('user-liked-themes')
    if (data.likedThemes && data.likedThemes.length > 0) {
      likedContainer.innerHTML = ''
      for (const theme of data.likedThemes) {
        likedContainer.appendChild(buildThemeItem(theme, false))
      }
    } else {
      likedContainer.innerHTML = `<div class="empty-state">${t('page.noLiked')} <a href="/themes/">${t('page.browseThemes')}</a></div>`
    }
  } catch (err) {
    document.getElementById('user-loading').textContent = `Failed to load: ${err.message}`
    if (err.message === 'Unauthorized') {
      window.location.href = '/login/'
    }
  }
}

function buildThemeItem (theme, isOwned) {
  const item = document.createElement('div')
  item.className = 'theme-item'

  const swatches = buildPreviewSwatches(theme.themeConfig, theme.uiThemeConfig)
  const badge = isOwned
    ? (theme.isPublic ? `<span class="badge-public">${t('page.public')}</span>` : `<span class="badge-private">${t('page.private')}</span>`)
    : ''
  const likeCount = theme.likeCount !== undefined ? `<span class="theme-item-likes">❤ ${theme.likeCount}</span>` : ''

  item.innerHTML = `
    <div class="theme-item-preview">
      <div class="theme-item-colors">${swatches}</div>
    </div>
    <div class="theme-item-info">
      <div class="theme-item-name">${escapeHtml(theme.name)}</div>
      <div class="theme-item-meta">
        ${badge}
        ${likeCount}
      </div>
    </div>
    <div class="theme-item-actions">
      ${isOwned ? `<button class="btn btn-ghost btn-sm" data-action="publish">${theme.isPublic ? t('page.unpublish') : t('page.publish')}</button>` : ''}
      <button class="btn btn-ghost btn-sm" data-action="copy">${t('page.copy')}</button>
      <button class="btn btn-ghost btn-sm" data-action="edit">${t('page.edit')}</button>
      ${!isOwned ? '<button class="btn btn-ghost btn-sm" data-action="like">❤</button>' : ''}
    </div>
  `

  // Attach action handlers
  const themeId = theme.id

  item.querySelector('[data-action="copy"]').addEventListener('click', (e) => {
    e.stopPropagation()
    handleCopy(theme)
  })

  item.querySelector('[data-action="edit"]').addEventListener('click', (e) => {
    e.stopPropagation()
    handleEdit(theme)
  })

  if (isOwned) {
    const pubBtn = item.querySelector('[data-action="publish"]')
    if (pubBtn) {
      pubBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        handlePublish(themeId, pubBtn)
      })
    }
  }

  if (!isOwned) {
    const likeBtn = item.querySelector('[data-action="like"]')
    if (likeBtn) {
      likeBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        handleLike(themeId, likeBtn)
      })
    }
  }

  // Click card to view details
  item.addEventListener('click', () => {
    window.location.href = `/theme/${themeId}`
  })

  return item
}

async function handleCopy (theme) {
  // If we don't have full config, fetch it
  let fullTheme = theme
  if (!theme.themeConfig || Object.keys(theme.themeConfig).length === 0) {
    try {
      const data = await apiGet(`/themes/${theme.id}`)
      fullTheme = data.theme
    } catch (err) {
      toast('Failed to fetch theme', 'error')
      return
    }
  }
  const text = convertThemeToText(fullTheme, true)
  copyToClipboard(text).then((ok) => {
    toast(ok ? t('toast.configCopied') : t('toast.copyFailed'), ok ? 'success' : 'error')
  })
}

function handleEdit (theme) {
  // Fetch full theme if needed, then redirect to editor
  if (theme.themeConfig && Object.keys(theme.themeConfig).length > 0) {
    const importData = encodeURIComponent(JSON.stringify({
      name: theme.name,
      themeConfig: theme.themeConfig,
      uiThemeConfig: theme.uiThemeConfig
    }))
    window.location.href = `/?import=${importData}`
  } else {
    // Fetch first
    apiGet(`/themes/${theme.id}`).then((data) => {
      const importData = encodeURIComponent(JSON.stringify({
        name: data.theme.name,
        themeConfig: data.theme.themeConfig,
        uiThemeConfig: data.theme.uiThemeConfig
      }))
      window.location.href = `/?import=${importData}`
    }).catch(() => {
      toast('Failed to load theme for editing', 'error')
    })
  }
}

async function handlePublish (themeId, btn) {
  try {
    const data = await apiPost(`/themes/${themeId}/publish`)
    if (data.theme.isPublic) {
      btn.textContent = t('page.unpublish')
      toast(t('toast.themePublished'), 'success')
    } else {
      btn.textContent = t('page.publish')
      toast(t('toast.themeUnpublished'), '')
    }
    // Reload to update badges
    setTimeout(() => window.location.reload(), 1000)
  } catch (err) {
    toast(err.message || 'Failed to publish', 'error')
  }
}

async function handleLike (themeId, btn) {
  try {
    const data = await apiPost(`/themes/${themeId}/like`)
    if (data.isLiked) {
      btn.textContent = '❤'
      btn.style.color = 'var(--brand-600)'
    } else {
      btn.textContent = '♡'
      btn.style.color = ''
    }
    toast(data.isLiked ? t('toast.likeSuccess') : t('toast.unlikeSuccess'), data.isLiked ? 'success' : '')
  } catch (err) {
    toast(err.message || 'Failed to like', 'error')
  }
}

function escapeHtml (str) {
  const div = document.createElement('div')
  div.textContent = str || ''
  return div.innerHTML
}

document.addEventListener('DOMContentLoaded', init)
