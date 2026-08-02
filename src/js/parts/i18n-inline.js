/**
 * Global client-side i18n engine.
 *
 * Every page embeds a JSON blob (#page-i18n-data) containing all locale
 * data for header, nav, footer, and page-specific content. On page load
 * the engine reads the saved language from localStorage (default 'en'),
 * applies translations to all [data-i18n] elements, and wires up the
 * header language switcher.
 */

const LANG_STORAGE_KEY = 'theme_electerm_lang'

const LOCALE_NAMES = {
  en: 'English',
  zh: '中文'
}

let _i18nData = null
const _renderers = []

export function getSavedLang () {
  try {
    return localStorage.getItem(LANG_STORAGE_KEY) || 'en'
  } catch {
    return 'en'
  }
}

export function saveLang (lang) {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang)
  } catch {
    // ignore
  }
}

export function getI18nData (scriptId = 'page-i18n-data') {
  const el = document.getElementById(scriptId)
  if (!el) return null
  try {
    return JSON.parse(el.textContent)
  } catch {
    return null
  }
}

export function getLocaleData (lang) {
  if (!_i18nData) return null
  return _i18nData[lang] || _i18nData.en || null
}

function resolveKey (localeData, keyPath) {
  if (!localeData) return undefined
  const parts = keyPath.split('.')
  let current = localeData
  for (const part of parts) {
    if (current == null) return undefined
    if (typeof current === 'object' && part in current) {
      current = current[part]
    } else if (Array.isArray(current) && /^\d+$/.test(part)) {
      current = current[parseInt(part, 10)]
    } else {
      return undefined
    }
  }
  return typeof current === 'string' ? current : undefined
}

export function t (key, lang) {
  const locale = lang || getSavedLang()
  const localeData = getLocaleData(locale)
  return resolveKey(localeData, key)
}

export function applyLang (lang) {
  if (!_i18nData || !_i18nData[lang]) return
  const localeData = _i18nData[lang]

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n')
    const value = resolveKey(localeData, key)
    if (value !== undefined) {
      el.textContent = value
    }
  })

  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder')
    const value = resolveKey(localeData, key)
    if (value !== undefined) {
      el.setAttribute('placeholder', value)
    }
  })

  document.documentElement.setAttribute('lang', lang === 'zh' ? 'zh-CN' : 'en')

  updateSwitcherDisplay(lang)

  _renderers.forEach((fn) => {
    try {
      fn(lang, _i18nData)
    } catch (e) {
      console.error('i18n renderer error:', e)
    }
  })
}

export function onLangChange (fn) {
  _renderers.push(fn)
}

function updateSwitcherDisplay (lang) {
  const langNameEl = document.querySelector('.lang-switcher .current-lang-name')
  if (langNameEl) {
    langNameEl.textContent = LOCALE_NAMES[lang] || 'English'
  }

  document.querySelectorAll('.lang-switcher .lang-option').forEach((btn) => {
    const isActive = btn.getAttribute('data-lang') === lang
    btn.classList.toggle('active', isActive)
    const checkmark = btn.querySelector('svg')
    if (checkmark) {
      checkmark.style.display = isActive ? 'inline' : 'none'
    }
  })
}

function initHeaderLangSwitcher () {
  const switcher = document.querySelector('.lang-switcher')
  if (!switcher) return

  const current = switcher.querySelector('.lang-current')
  const dropdown = switcher.querySelector('.lang-dropdown')
  if (!current || !dropdown) return

  current.addEventListener('click', (e) => {
    e.stopPropagation()
    const isOpen = !dropdown.hasAttribute('hidden')
    if (isOpen) {
      dropdown.setAttribute('hidden', '')
      switcher.classList.remove('open')
      current.setAttribute('aria-expanded', 'false')
    } else {
      dropdown.removeAttribute('hidden')
      switcher.classList.add('open')
      current.setAttribute('aria-expanded', 'true')
    }
  })

  dropdown.querySelectorAll('.lang-option').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const lang = btn.getAttribute('data-lang')
      if (!lang) return
      saveLang(lang)
      applyLang(lang)
      dropdown.setAttribute('hidden', '')
      switcher.classList.remove('open')
      current.setAttribute('aria-expanded', 'false')
    })
  })

  document.addEventListener('click', () => {
    if (!dropdown.hasAttribute('hidden')) {
      dropdown.setAttribute('hidden', '')
      switcher.classList.remove('open')
      current.setAttribute('aria-expanded', 'false')
    }
  })

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !dropdown.hasAttribute('hidden')) {
      dropdown.setAttribute('hidden', '')
      switcher.classList.remove('open')
      current.setAttribute('aria-expanded', 'false')
    }
  })
}

export function initI18n () {
  _i18nData = getI18nData('page-i18n-data')
  const savedLang = getSavedLang()
  applyLang(savedLang)
  initHeaderLangSwitcher()
}
