/**
 * Themes page — list all public themes with preview cards.
 */
import { apiGet } from '../lib/api.js'
import { buildPreviewSwatches } from '../lib/ui.js'
import { initHeader } from '../parts/header.js'
import { t } from '../parts/i18n-inline.js'

let currentSort = 'newest'
let offset = 0
let total = 0
const LIMIT = 24

function init () {
  initHeader()
  loadThemes(true)
  loadMeta()

  // Sort buttons
  document.querySelectorAll('.sort-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentSort = btn.dataset.sort
      document.querySelectorAll('.sort-btn').forEach((b) => b.classList.toggle('active', b === btn))
      offset = 0
      loadThemes(true)
    })
  })

  // Load more
  document.getElementById('btn-load-more').addEventListener('click', () => {
    loadThemes(false)
  })
}

async function loadMeta () {
  try {
    const data = await apiGet('/meta/')
    const meta = data.meta || {}
    const parts = []
    if (meta.total_themes) parts.push(`${meta.total_themes} ${t('page.themesCount')}`)
    if (meta.total_users) parts.push(`${meta.total_users} ${t('page.usersCount')}`)
    if (meta.total_likes) parts.push(`${meta.total_likes} ${t('page.likesCount')}`)
    document.getElementById('theme-stats').textContent = parts.join(' · ')
  } catch {}
}

async function loadThemes (reset) {
  const grid = document.getElementById('themes-grid')
  const loadMoreWrap = document.getElementById('load-more-wrap')

  if (reset) {
    offset = 0
    grid.innerHTML = `<div class="loading">${t('page.loading')}</div>`
  }

  try {
    const data = await apiGet(`/themes/?limit=${LIMIT}&offset=${offset}&sort=${currentSort}`)
    total = data.total

    if (reset) {
      grid.innerHTML = ''
    }

    if (data.themes.length === 0 && offset === 0) {
      grid.innerHTML = `<div class="empty-state">${t('page.noThemes')}</div>`
      loadMoreWrap.style.display = 'none'
      return
    }

    for (const theme of data.themes) {
      grid.appendChild(buildThemeCard(theme))
    }

    offset += data.themes.length

    // Show/hide load more
    if (offset < total) {
      loadMoreWrap.style.display = ''
    } else {
      loadMoreWrap.style.display = 'none'
    }
  } catch (err) {
    grid.innerHTML = `<div class="empty-state">${t('page.failed')}: ${err.message}</div>`
  }
}

function buildThemeCard (theme) {
  const card = document.createElement('div')
  card.className = 'theme-card'
  card.addEventListener('click', () => {
    window.location.href = `/theme/${theme.id}`
  })

  const swatches = buildPreviewSwatches(theme.themeConfig, theme.uiThemeConfig)

  const owner = theme.owner
  const authorHtml = owner
    ? `<div class="theme-card-author">
        <img class="theme-card-author-avatar" src="${escapeAttr(owner.avatarUrl)}" alt="" width="18" height="18" loading="lazy" referrerpolicy="no-referrer">
        <span class="theme-card-author-name">${escapeHtml(owner.name || owner.githubHandle || '')}</span>
      </div>`
    : ''

  card.innerHTML = `
    <div class="theme-card-preview">
      <div class="theme-card-colors">${swatches}</div>
    </div>
    <div class="theme-card-info">
      <div class="theme-card-name">${escapeHtml(theme.name)}</div>
      <div class="theme-card-meta">
        ${authorHtml}
        <span class="theme-card-likes">❤ ${theme.likeCount || 0}</span>
      </div>
    </div>
  `

  return card
}

function escapeHtml (str) {
  const div = document.createElement('div')
  div.textContent = str || ''
  return div.innerHTML
}

function escapeAttr (str) {
  return escapeHtml(str).replace(/"/g, '&quot;')
}

document.addEventListener('DOMContentLoaded', init)
