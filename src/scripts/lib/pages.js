/**
 * Page definitions and context builder.
 *
 * All pages are single-locale (English default for SEO). All i18n data
 * is embedded in each page as JSON for client-side language switching
 * via localStorage. No standalone /{lang}/ pages are generated.
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { LOCALES, DEFAULT_LOCALE, LOCALE_NAMES, LOCALE_HTML_LANG } from '../../data/i18n.js'
import { SITE, siteUrl, demoUrl as buildDemoUrl } from '../../data/site.js'
import { NAV_LINKS, NAV_I18N } from '../../data/nav.js'
import { HEADER_I18N } from '../../data/header.js'
import { FOOTER_I18N } from '../../data/footer.js'
import { HOME_I18N } from '../../data/home.js'
import { META_I18N } from '../../data/meta.js'
import { AUTH_I18N } from '../../data/auth-i18n.js'
import { LEGAL_I18N } from '../../data/legal-i18n.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const VIEWS_DIR = path.resolve(__dirname, '../../views')

// ── Route definition ─────────────────────────────────────────────

export function getPageRoutes () {
  return [
    { segments: [], template: 'pages/home', pageKey: 'home', jsPage: 'home', outputFile: 'index.html' },
    { segments: ['themes'], template: 'pages/themes', pageKey: 'themes', jsPage: 'themes', outputFile: 'themes/index.html' },
    { segments: ['theme'], template: 'pages/theme-detail', pageKey: 'theme-detail', jsPage: 'theme-detail', outputFile: 'theme/index.html' },
    { segments: ['user'], template: 'pages/user', pageKey: 'user', jsPage: 'user', outputFile: 'user/index.html' },
    { segments: ['login'], template: 'pages/login', pageKey: 'login', jsPage: 'login', outputFile: 'login/index.html' },
    { segments: ['login-admin'], template: 'pages/login-admin', pageKey: 'login-admin', jsPage: 'login', outputFile: 'login-admin/index.html' },
    { segments: ['admin'], template: 'pages/admin', pageKey: 'admin', jsPage: 'admin', outputFile: 'admin/index.html' },
    { segments: ['privacy'], template: 'pages/legal', pageKey: 'privacy', jsPage: 'legal', outputFile: 'privacy/index.html' },
    { segments: ['terms-of-use'], template: 'pages/legal', pageKey: 'terms-of-use', jsPage: 'legal', outputFile: 'terms-of-use/index.html' },
    { segments: ['404'], template: 'pages/404', pageKey: '404', jsPage: '404', outputFile: '404.html' }
  ]
}

export function getUrlPath (route) {
  if (route.segments.length === 0) return '/'
  return `/${route.segments.join('/')}/`
}

export function buildHreflang (route, isProd) {
  const base = siteUrl(isProd)
  const url = `${base}${getUrlPath(route)}`
  return { canonical: url, og: url }
}

// ── Context builder ──────────────────────────────────────────────

export function buildContext (route, options) {
  const { isDev, isProd, cssPath, jsPath } = options
  const demoUrlValue = buildDemoUrl(isDev)
  const locale = DEFAULT_LOCALE
  const header = HEADER_I18N[locale]
  const footer = buildFooterData(locale)
  const navTexts = NAV_I18N[locale]
  const meta = buildMeta(route)
  const hreflang = buildHreflang(route, isProd)

  const navLinks = NAV_LINKS.map((link) => {
    if (link.external) {
      return {
        key: link.key,
        href: link.href,
        label: navTexts[link.key] || link.key,
        active: false,
        external: true
      }
    }
    const href = link.href ? `/${link.href}/` : '/'
    const active = route.segments.length > 0
      ? route.segments[0] === link.href
      : link.href === ''
    return {
      key: link.key,
      href,
      label: navTexts[link.key] || link.key,
      active,
      external: false
    }
  })

  const page = buildPageData(route)
  const i18nData = buildI18nData(route)

  return {
    site: SITE,
    siteUrl: siteUrl(isProd),
    demoUrl: demoUrlValue,
    locale,
    htmlLang: LOCALE_HTML_LANG[locale],
    meta,
    navLinks,
    header,
    footer,
    homePath: '/',
    signInUrl: '/login/',
    cssPath,
    jsPath,
    isDev,
    isProd,
    pageKey: route.pageKey,
    currentPath: getUrlPath(route),
    canonicalUrl: hreflang.canonical,
    ogUrl: hreflang.og,
    ogImage: `${siteUrl(isProd)}/images/screen.jpg`,
    ogImageWidth: '1024',
    ogImageHeight: '524',
    year: new Date().getFullYear(),
    localeList: LOCALES.map((l) => ({ code: l, name: LOCALE_NAMES[l] })),
    page,
    i18nData,
    VIEWS_DIR
  }
}

function buildFooterData (locale) {
  const footer = FOOTER_I18N[locale]
  return {
    ...footer,
    links: {
      product: footer.links.product,
      project: footer.links.project,
      legal: footer.links.legal
    }
  }
}

function buildMeta (route) {
  return META_I18N[DEFAULT_LOCALE][route.pageKey] || {}
}

function buildPageData (route) {
  const locale = DEFAULT_LOCALE

  switch (route.pageKey) {
    case 'home':
      return {
        ...HOME_I18N[locale]
      }

    case 'themes':
      return {
        ...AUTH_I18N[locale].themes
      }

    case 'theme-detail':
      return {
        ...AUTH_I18N[locale].themeDetail
      }

    case 'login':
      return {
        ...AUTH_I18N[locale].login,
        githubLoginApiUrl: '/api/auth/login-url'
      }

    case 'login-admin':
      return {
        ...AUTH_I18N[locale].loginAdmin,
        githubLoginApiUrl: '/api/auth/login-admin-url',
        homeUrl: '/'
      }

    case 'admin':
      return {
        ...AUTH_I18N[locale].admin
      }

    case 'privacy':
    case 'terms-of-use':
      return {
        ...LEGAL_I18N[locale][route.pageKey]
      }

    case 'user':
      return {
        ...AUTH_I18N[locale].user
      }

    case '404': {
      const messages = AUTH_I18N[locale].notFound
      return {
        ...messages,
        homeUrl: '/'
      }
    }

    default:
      return {}
  }
}

function buildI18nData (route) {
  const data = {}
  for (const loc of LOCALES) {
    data[loc] = {
      header: HEADER_I18N[loc],
      nav: NAV_I18N[loc],
      footer: FOOTER_I18N[loc],
      page: buildPageI18nData(loc, route),
      toast: AUTH_I18N[loc].toast
    }
  }
  return JSON.stringify(data)
}

function buildPageI18nData (loc, route) {
  switch (route.pageKey) {
    case 'home':
      return { ...HOME_I18N[loc] }

    case 'themes':
      return { ...AUTH_I18N[loc].themes }

    case 'theme-detail':
      return { ...AUTH_I18N[loc].themeDetail }

    case 'login':
      return { ...AUTH_I18N[loc].login }

    case 'login-admin':
      return { ...AUTH_I18N[loc].loginAdmin }

    case 'admin':
      return { ...AUTH_I18N[loc].admin }

    case 'privacy':
    case 'terms-of-use':
      return { ...LEGAL_I18N[loc][route.pageKey] }

    case 'user':
      return { ...AUTH_I18N[loc].user }

    case '404':
      return { ...AUTH_I18N[loc].notFound }

    default:
      return {}
  }
}

// ── All routes (for sitemap) ─────────────────────────────────────

export function getAllRoutes () {
  return getPageRoutes()
    .filter((route) => {
      if (route.pageKey === '404') return false
      if (route.pageKey === 'user') return false
      if (route.pageKey === 'login') return false
      if (route.pageKey === 'login-admin' || route.pageKey === 'admin') return false
      return true
    })
    .map((route) => ({
      route,
      outputPath: route.outputFile,
      urlPath: getUrlPath(route)
    }))
}

export { LOCALES, DEFAULT_LOCALE }
