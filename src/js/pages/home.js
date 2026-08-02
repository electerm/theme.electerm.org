/**
 * Home page — theme editor with live iframe preview.
 */
import { defaultTheme, convertThemeToText, convertTheme, getUIColorKeys, getTerminalColorKeys } from '../lib/theme.js'
import { initIframeControl, applyTheme, isIframeReady } from '../lib/iframe-control.js'
import { loginWithPopup, isLoggedIn } from '../lib/auth.js'
import { apiPost, apiPut } from '../lib/api.js'
import { toast, copyToClipboard } from '../lib/ui.js'
import { initHeader } from '../parts/header.js'
import { t } from '../parts/i18n-inline.js'

let currentTheme = defaultTheme()
let editingThemeId = null
let activeTab = 'picker'

function init () {
  // Initialize header (i18n, mobile menu, user menu)
  initHeader()

  // Check if editing an existing theme (via URL params)
  const params = new URLSearchParams(window.location.search)
  const editId = params.get('edit')
  const importData = params.get('import')

  if (importData) {
    try {
      const data = JSON.parse(decodeURIComponent(importData))
      currentTheme = {
        name: data.name || 'My Theme',
        themeConfig: data.themeConfig || {},
        uiThemeConfig: data.uiThemeConfig || {}
      }
    } catch {}
  }

  if (editId) {
    // Fetch theme data for editing
    fetch(`/api/themes/${editId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.theme) {
          editingThemeId = data.theme.id
          currentTheme = {
            name: data.theme.name,
            themeConfig: data.theme.themeConfig,
            uiThemeConfig: data.theme.uiThemeConfig
          }
          renderEditor()
        }
      })
      .catch(() => {})
  }

  // Set demo iframe URL (already set via Pug template, but ensure it's correct)
  const frame = document.getElementById('demo-frame')
  const demoUrl = document.body.dataset.demoUrl
  if (demoUrl && frame) {
    frame.src = demoUrl
  }

  // Init iframe control
  initIframeControl(frame, () => {
    // Apply current theme when iframe is ready
    applyThemeToIframe()
  })

  // Set theme name input
  const nameInput = document.getElementById('theme-name-input')
  nameInput.value = currentTheme.name
  nameInput.addEventListener('input', () => {
    currentTheme.name = nameInput.value
  })

  // Tab switching (Color Picker / Text Editor / AI)
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab))
  })

  // Text editor
  const textArea = document.getElementById('theme-text')
  textArea.value = convertThemeToText(currentTheme)
  textArea.addEventListener('input', () => {
    const converted = convertTheme(textArea.value)
    currentTheme.themeConfig = converted.themeConfig
    currentTheme.uiThemeConfig = converted.uiThemeConfig
    if (converted.name) currentTheme.name = converted.name
    applyThemeToIframe()
    renderColorPickers()
  })

  // Save button
  document.getElementById('btn-save').addEventListener('click', handleSave)

  // Publish button
  document.getElementById('btn-publish').addEventListener('click', handlePublish)

  // Copy config button
  document.getElementById('btn-copy-config').addEventListener('click', () => {
    const text = convertThemeToText(currentTheme, true)
    copyToClipboard(text).then((ok) => {
      toast(ok ? t('toast.configCopied') : t('toast.copyFailed'), ok ? 'success' : 'error')
    })
  })

  // Import button
  document.getElementById('btn-import').addEventListener('click', () => {
    document.getElementById('file-import').click()
  })

  document.getElementById('file-import').addEventListener('change', (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result
      const converted = convertTheme(text)
      currentTheme = {
        name: converted.name || file.name.replace('.txt', ''),
        themeConfig: converted.themeConfig,
        uiThemeConfig: converted.uiThemeConfig
      }
      nameInput.value = currentTheme.name
      textArea.value = convertThemeToText(currentTheme)
      renderColorPickers()
      applyThemeToIframe()
      toast(t('toast.themeImported'), 'success')
    }
    reader.readAsText(file)
    e.target.value = ''
  })

  // AI theme generator (lives in the "AI" tab)
  initAiGenerator()

  renderEditor()
}

function renderEditor () {
  renderColorPickers()
  document.getElementById('theme-text').value = convertThemeToText(currentTheme)
  applyThemeToIframe()

  // Show publish button if editing and theme is already saved
  if (editingThemeId) {
    document.getElementById('btn-publish').style.display = ''
  }
}

function renderColorPickers () {
  const uiContainer = document.getElementById('ui-colors')
  const termContainer = document.getElementById('terminal-colors')

  const uiKeys = getUIColorKeys()
  const termKeys = getTerminalColorKeys()

  uiContainer.innerHTML = uiKeys.map((key) => {
    const value = currentTheme.uiThemeConfig[key] || '#000000'
    return `
      <div class="color-item">
        <span class="color-item-label">${key}</span>
        <div class="color-picker-wrap">
          <input type="color" class="color-picker-input" data-section="ui" data-key="${key}" value="${normalizeColor(value)}">
        </div>
      </div>
    `
  }).join('')

  termContainer.innerHTML = termKeys.map((key) => {
    const value = currentTheme.themeConfig[key] || '#000000'
    return `
      <div class="color-item">
        <span class="color-item-label">${key}</span>
        <div class="color-picker-wrap">
          <input type="color" class="color-picker-input" data-section="term" data-key="${key}" value="${normalizeColor(value)}">
        </div>
      </div>
    `
  }).join('')

  // Attach listeners
  document.querySelectorAll('.color-picker-input').forEach((input) => {
    input.addEventListener('input', handleColorChange)
  })
}

function normalizeColor (value) {
  // Color input only supports hex, convert rgba to hex if possible
  if (value && value.startsWith('#')) {
    return value.length === 4
      ? '#' + value[1] + value[1] + value[2] + value[2] + value[3] + value[3]
      : value
  }
  if (value && value.startsWith('rgba')) {
    // Extract RGB from rgba
    const match = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(value)
    if (match) {
      const r = parseInt(match[1])
      const g = parseInt(match[2])
      const b = parseInt(match[3])
      return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')
    }
  }
  return '#000000'
}

function handleColorChange (e) {
  const section = e.target.dataset.section
  const key = e.target.dataset.key
  const value = e.target.value

  if (section === 'ui') {
    currentTheme.uiThemeConfig[key] = value
  } else {
    currentTheme.themeConfig[key] = value
  }

  // Update text editor
  document.getElementById('theme-text').value = convertThemeToText(currentTheme)

  applyThemeToIframe()
}

function applyThemeToIframe () {
  if (isIframeReady()) {
    applyTheme(currentTheme.themeConfig, currentTheme.uiThemeConfig)
  }
}

// ── AI theme generator ────────────────────────────────────────
function initAiGenerator () {
  const btnGenerate = document.getElementById('btn-ai-generate')
  const textarea = document.getElementById('ai-description')
  if (!btnGenerate || !textarea) return

  btnGenerate.addEventListener('click', handleAiGenerate)

  // submit on Ctrl/Cmd+Enter inside the textarea
  textarea.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleAiGenerate()
    }
  })
}

async function handleAiGenerate () {
  const textarea = document.getElementById('ai-description')
  const btnGenerate = document.getElementById('btn-ai-generate')
  const description = (textarea.value || '').trim()

  if (!description) {
    toast(t('page.editor.aiEmptyDesc'), 'error')
    return
  }

  // AI generation is server-side and gated by auth — sign in first if needed.
  // Opens the /login page in a popup so the editor state is preserved.
  if (!isLoggedIn()) {
    try {
      await loginWithPopup(window.location.pathname + window.location.search)
    } catch (err) {
      toast(err.message || t('page.editor.aiLoginRequired'), 'error')
      return
    }
    if (!isLoggedIn()) {
      toast(t('page.editor.aiLoginRequired'), 'error')
      return
    }
  }

  btnGenerate.disabled = true
  btnGenerate.textContent = t('page.editor.aiGenerating')

  try {
    const data = await apiPost('/themes/ai-create', { description })
    const theme = data && data.theme
    if (!theme || !theme.themeConfig) {
      throw new Error('Invalid AI response')
    }
    loadThemeIntoEditor(theme)
    toast(t('page.editor.aiGenerated'), 'success')
  } catch (err) {
    toast(err.message || 'AI generation failed', 'error')
  } finally {
    btnGenerate.disabled = false
    btnGenerate.textContent = t('page.editor.aiGenerate')
  }
}

/**
 * Switch the active editor tab (picker / text / ai).
 */
function switchTab (name) {
  activeTab = name
  document.querySelectorAll('.tab-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.tab === name)
  })
  document.querySelectorAll('.tab-content').forEach((panel) => {
    panel.style.display = panel.id === 'tab-' + name ? '' : 'none'
  })
  if (activeTab === 'text') {
    document.getElementById('theme-text').value = convertThemeToText(currentTheme)
  }
}

/**
 * Load a full theme object ({ name, themeConfig, uiThemeConfig }) into the
 * editor, refreshing name input, text editor, color pickers and preview.
 */
function loadThemeIntoEditor (theme) {
  currentTheme = {
    name: theme.name || 'My Theme',
    themeConfig: theme.themeConfig || {},
    uiThemeConfig: theme.uiThemeConfig || {}
  }
  // An AI-generated theme is a fresh starting point — clear any prior
  // edit binding so saving creates a new theme rather than overwriting.
  editingThemeId = null
  const url = new URL(window.location)
  url.searchParams.delete('edit')
  window.history.replaceState({}, '', url)

  document.getElementById('theme-name-input').value = currentTheme.name
  renderEditor()
  // Show the generated colors in the picker tab
  switchTab('picker')
}

async function handleSave () {
  // Not logged in — open the /login page in a popup (so the user sees the
  // terms + login button) instead of redirecting away from the editor. The
  // editor state stays in memory and we continue saving after sign-in.
  if (!isLoggedIn()) {
    try {
      await loginWithPopup(window.location.pathname + window.location.search)
    } catch (err) {
      toast(err.message || t('toast.loginFailed'), 'error')
      return
    }
    if (!isLoggedIn()) return
  }

  try {
    if (editingThemeId) {
      // Update existing theme
      await apiPut(`/themes/${editingThemeId}`, {
        name: currentTheme.name,
        themeConfig: currentTheme.themeConfig,
        uiThemeConfig: currentTheme.uiThemeConfig
      })
      toast(t('toast.themeSaved'), 'success')
      document.getElementById('btn-publish').style.display = ''
    } else {
      // Create new theme
      const data = await apiPost('/themes/', {
        name: currentTheme.name,
        themeConfig: currentTheme.themeConfig,
        uiThemeConfig: currentTheme.uiThemeConfig
      })
      editingThemeId = data.theme.id
      toast(t('toast.themeCreated'), 'success')
      document.getElementById('btn-publish').style.display = ''

      // Update URL without reload
      const url = new URL(window.location)
      url.searchParams.set('edit', editingThemeId)
      window.history.replaceState({}, '', url)
    }
  } catch (err) {
    toast(err.message || 'Save failed', 'error')
  }
}

async function handlePublish () {
  if (!editingThemeId) {
    toast(t('toast.saveFirst'), 'error')
    return
  }

  if (!isLoggedIn()) {
    try {
      await loginWithPopup('/')
    } catch (err) {
      toast(err.message || t('toast.loginFailed'), 'error')
      return
    }
  }

  try {
    const data = await apiPost(`/themes/${editingThemeId}/publish`)
    if (data.theme.isPublic) {
      toast(t('toast.themePublished'), 'success')
      // Show share buttons
      const btn = document.getElementById('btn-publish')
      btn.textContent = t('page.editor.share')
    } else {
      toast(t('toast.themeUnpublished'), '')
      const btn = document.getElementById('btn-publish')
      btn.textContent = t('page.editor.share')
    }
  } catch (err) {
    toast(err.message || 'Publish failed', 'error')
  }
}

document.addEventListener('DOMContentLoaded', init)
