/**
 * Global site configuration.
 */
export const SITE = {
  name: 'electerm theme editor',
  shortName: 'electerm theme editor',
  domain: 'theme.electerm.org',
  devUrl: 'http://127.0.0.1:5678',
  prodUrl: 'https://theme.electerm.org',
  demoDevUrl: 'http://127.0.0.1:5580?showThemeColor=1',
  demoProdUrl: 'https://demo.electerm.org?showThemeColor=1',
  description:
    'Create, preview and share custom themes for electerm terminal. A free theme editor with live preview and community sharing.',
  keywords: 'electerm, theme editor, terminal theme, electerm theme, color scheme, terminal color',
  author: 'ZHAO Xudong',
  twitter: '@zxdong262',
  themeColor: '#1389FD',
  backgroundColor: '#ffffff',
  locale: 'en',
  // Google Analytics 4 measurement ID
  gaId: 'G-LCY5SM7M8J'
}

export function siteUrl (isProd = true) {
  return isProd ? SITE.prodUrl : SITE.devUrl
}

export function demoUrl (isDev = false) {
  return isDev ? SITE.demoDevUrl : SITE.demoProdUrl
}
