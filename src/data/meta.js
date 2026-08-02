import { SITE } from './site.js'

export const META_I18N = {
  en: {
    home: {
      title: 'electerm theme editor: create, preview, share',
      description: SITE.description,
      keywords: SITE.keywords,
      ogType: 'website',
      canonicalPath: ''
    },
    themes: {
      title: `Browse Themes — ${SITE.name}`,
      description: 'Explore community-created electerm themes. Find the perfect color scheme for your terminal.',
      canonicalPath: 'themes'
    },
    'theme-detail': {
      title: `Theme Detail — ${SITE.name}`,
      description: 'View, like, copy, and share electerm themes.',
      canonicalPath: 'theme'
    },
    login: {
      title: `Sign In — ${SITE.name}`,
      description: 'Sign in with GitHub to save and share your electerm themes.',
      canonicalPath: 'login'
    },
    user: {
      title: `My Profile — ${SITE.name}`,
      description: 'View your themes and manage your account.',
      canonicalPath: 'user'
    },
    privacy: {
      title: `Privacy Policy — ${SITE.name}`,
      description: 'Learn how theme.electerm.org collects, uses, and protects your information.',
      canonicalPath: 'privacy'
    },
    'terms-of-use': {
      title: `Terms of Use — ${SITE.name}`,
      description: 'The terms and conditions for using the theme.electerm.org theme editor and sharing platform.',
      canonicalPath: 'terms-of-use'
    },
    404: {
      title: `Page Not Found — ${SITE.name}`,
      description: 'The page you are looking for does not exist.',
      canonicalPath: '',
      noindex: true
    }
  },
  zh: {
    home: {
      title: 'electerm 主题编辑器：创建、预览、分享',
      description: '创建、预览和分享 electerm 终端自定义主题。免费的主题编辑器，支持实时预览和社区分享。',
      keywords: 'electerm, 主题编辑器, 终端主题, electerm 主题, 配色方案, 终端颜色',
      ogType: 'website',
      canonicalPath: ''
    },
    themes: {
      title: `浏览主题 — ${SITE.name}`,
      description: '探索社区创建的 electerm 主题。为您的终端找到完美的配色方案。',
      canonicalPath: 'themes'
    },
    'theme-detail': {
      title: `主题详情 — ${SITE.name}`,
      description: '查看、点赞、复制和分享 electerm 主题。',
      canonicalPath: 'theme'
    },
    login: {
      title: `登录 — ${SITE.name}`,
      description: '使用 GitHub 登录，保存和分享您的 electerm 主题。',
      canonicalPath: 'login'
    },
    user: {
      title: `个人中心 — ${SITE.name}`,
      description: '查看您的主题和管理账户。',
      canonicalPath: 'user'
    },
    privacy: {
      title: `隐私政策 — ${SITE.name}`,
      description: '了解 theme.electerm.org 如何收集、使用和保护您的信息。',
      canonicalPath: 'privacy'
    },
    'terms-of-use': {
      title: `使用条款 — ${SITE.name}`,
      description: '使用 theme.electerm.org 主题编辑器和分享平台的条款与条件。',
      canonicalPath: 'terms-of-use'
    },
    404: {
      title: `页面未找到 — ${SITE.name}`,
      description: '您要找的页面不存在。',
      canonicalPath: '',
      noindex: true
    }
  }
}
