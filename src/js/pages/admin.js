/**
 * Admin dashboard — view site stats, users, and themes.
 */
import { initHeader } from '../parts/header.js'
import { onLangChange, t } from '../parts/i18n-inline.js'

document.addEventListener('DOMContentLoaded', () => {
  initHeader()
  initTabs()
  initLogout()

  loadStats()
  loadUsers()
  loadThemes()

  // Re-render tables when the language changes so dynamic labels update.
  onLangChange(() => {
    loadUsers()
    loadThemes()
  })
})

/**
 * If the admin API rejects the request (no session / not an admin), bounce
 * to the admin login page. This guards the page at the client level — the
 * static HTML is served before the Worker guard runs (asset-first serving),
 * so we rely on the API to enforce access and redirect when denied.
 */
function handleDenied (res) {
  if (res.status === 401 || res.status === 403) {
    window.location.href = '/login-admin/'
    return true
  }
  return false
}

function initTabs () {
  const tabs = document.querySelectorAll('.admin-tab')
  const panels = document.querySelectorAll('.admin-tab-panel')

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab
      tabs.forEach((tt) => tt.classList.remove('active'))
      tab.classList.add('active')
      panels.forEach((p) => {
        p.classList.toggle('active', p.id === `panel-${target}`)
      })
    })
  })
}

function initLogout () {
  const btn = document.getElementById('admin-logout-btn')
  if (btn) {
    btn.addEventListener('click', () => {
      window.location.href = '/api/auth/logout'
    })
  }
}

// ── Stats ─────────────────────────────────────────────────────────

async function loadStats () {
  try {
    const res = await fetch('/api/admin/stats', { credentials: 'same-origin' })
    if (handleDenied(res)) return
    if (!res.ok) return
    const data = await res.json()
    const s = data.stats || {}
    setText('stat-users', s.totalUsers)
    setText('stat-themes', s.totalThemes)
    setText('stat-public', s.publicThemes)
    setText('stat-likes', s.totalLikes)
  } catch (e) {
    console.error('Stats load failed:', e)
  }
}

// ── Users ─────────────────────────────────────────────────────────

async function loadUsers () {
  const loadingEl = document.getElementById('users-loading')
  const emptyEl = document.getElementById('users-empty')
  const errorEl = document.getElementById('users-error')
  const tableWrap = document.getElementById('users-table-wrap')
  const tbody = document.getElementById('users-body')

  show(loadingEl); hide(emptyEl); hide(errorEl); hide(tableWrap)

  try {
    const res = await fetch('/api/admin/users', { credentials: 'same-origin' })
    if (handleDenied(res)) return
    if (!res.ok) throw new Error('Failed')
    const data = await res.json()
    const users = data.users || []

    hide(loadingEl)

    if (users.length === 0) {
      show(emptyEl)
      return
    }

    show(tableWrap)
    tbody.innerHTML = users.map((u) => {
      const disabled = u.status === 'disabled'
      const statusClass = disabled ? 'status-badge-disabled' : 'status-badge-active'
      const statusText = disabled ? t('page.statusDisabled') : t('page.statusActive')
      const roleText = u.role === 'admin' ? t('page.roleAdmin') : t('page.roleUser')
      const toggleBtn = disabled
        ? `<button class="btn btn-sm btn-ghost" onclick="window._toggleUser('${u.id}','active')">${t('page.btnEnable')}</button>`
        : `<button class="btn btn-sm btn-ghost" onclick="window._toggleUser('${u.id}','disabled')">${t('page.btnDisable')}</button>`
      const handle = u.github_handle || u.name || ''
      const nameCell = handle
        ? `<a class="admin-link" href="https://github.com/${encodeURIComponent(handle)}" target="_blank" rel="noopener noreferrer">${escapeHtml(u.name || handle)}</a>`
        : escapeHtml(u.name || '—')
      return `
        <tr>
          <td>${nameCell}</td>
          <td>${escapeHtml(u.email || '—')}</td>
          <td>${roleText}</td>
          <td><span class="status-badge ${statusClass}">${statusText}</span></td>
          <td>${u.theme_count ?? 0}</td>
          <td>${u.liked_themes_count ?? 0}</td>
          <td>${formatDate(u.created_at)}</td>
          <td>${toggleBtn} <button class="btn btn-sm btn-ghost" onclick="window._deleteUser('${u.id}')">${t('page.btnDelete')}</button></td>
        </tr>`
    }).join('')
  } catch {
    hide(loadingEl)
    show(errorEl)
  }
}

window._toggleUser = async function (id, status) {
  try {
    await fetch(`/api/admin/users/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
      credentials: 'same-origin'
    })
    await loadUsers()
    await loadStats()
  } catch (e) {
    console.error('Toggle failed:', e)
  }
}

window._deleteUser = async function (id) {
  if (!confirm(t('page.deleteUserConfirm'))) return
  try {
    await fetch(`/api/admin/users/${id}`, {
      method: 'DELETE',
      credentials: 'same-origin'
    })
    await loadUsers()
    await loadStats()
    await loadThemes()
  } catch (e) {
    console.error('Delete failed:', e)
  }
}

// ── Themes ────────────────────────────────────────────────────────

async function loadThemes () {
  const loadingEl = document.getElementById('themes-loading')
  const emptyEl = document.getElementById('themes-empty')
  const errorEl = document.getElementById('themes-error')
  const tableWrap = document.getElementById('themes-table-wrap')
  const tbody = document.getElementById('themes-body')

  show(loadingEl); hide(emptyEl); hide(errorEl); hide(tableWrap)

  try {
    const res = await fetch('/api/admin/themes', { credentials: 'same-origin' })
    if (handleDenied(res)) return
    if (!res.ok) throw new Error('Failed')
    const data = await res.json()
    const themes = data.themes || []

    hide(loadingEl)

    if (themes.length === 0) {
      show(emptyEl)
      return
    }

    show(tableWrap)
    tbody.innerHTML = themes.map((th) => {
      const isPublic = th.is_public === 1 || th.is_public === true
      const visClass = isPublic ? 'status-badge-active' : 'status-badge-inactive'
      const visText = isPublic ? t('page.visibilityPublic') : t('page.visibilityPrivate')
      const author = th.author_handle
        ? `<a class="admin-link" href="https://github.com/${encodeURIComponent(th.author_handle)}" target="_blank" rel="noopener noreferrer">${escapeHtml(th.author_name || th.author_handle)}</a>`
        : escapeHtml(th.author_name || '—')
      return `
        <tr>
          <td><a class="admin-link" href="/theme/${encodeURIComponent(th.id)}">${escapeHtml(th.name)}</a></td>
          <td>${author}</td>
          <td><span class="status-badge ${visClass}">${visText}</span></td>
          <td>${th.like_count ?? 0}</td>
          <td>${formatDate(th.created_at)}</td>
          <td><a class="btn btn-sm btn-ghost" href="/theme/${encodeURIComponent(th.id)}">${t('page.btnView')}</a></td>
        </tr>`
    }).join('')
  } catch {
    hide(loadingEl)
    show(errorEl)
  }
}

// ── Utils ─────────────────────────────────────────────────────────

function setText (id, value) {
  const el = document.getElementById(id)
  if (el) el.textContent = value ?? '—'
}

function show (el) {
  if (el) el.classList.remove('hidden')
}

function hide (el) {
  if (el) el.classList.add('hidden')
}

function escapeHtml (str) {
  if (str == null) return ''
  const div = document.createElement('div')
  div.textContent = String(str)
  return div.innerHTML
}

function formatDate (dateStr) {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return dateStr
  }
}
