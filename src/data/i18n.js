/**
 * Locale configuration — shared by all data files, templates, and build scripts.
 * Supports en/zh for now, expandable later.
 */
export const LOCALES = ['en', 'zh']
export const DEFAULT_LOCALE = 'en'

export const LOCALE_NAMES = {
  en: 'English',
  zh: '中文'
}

export const LOCALE_HTML_LANG = {
  en: 'en',
  zh: 'zh-CN'
}

/**
 * Returns the URL path without locale prefix (single-locale site).
 */
export function stripLocale (path) {
  return { locale: DEFAULT_LOCALE, rest: path.replace(/^\/+/, '') }
}

export function isLocale (value) {
  return LOCALES.includes(value)
}
