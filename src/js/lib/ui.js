/**
 * Shared UI helpers — toast, clipboard, formatting, etc.
 */

/**
 * Show a toast message.
 */
export function toast (message, type = '') {
  const el = document.getElementById('toast')
  if (!el) {
    alert(message)
    return
  }
  el.textContent = message
  el.className = 'toast show' + (type ? ' ' + type : '')
  setTimeout(() => {
    el.className = 'toast' + (type ? ' ' + type : '')
  }, 3000)
}

/**
 * Copy text to clipboard.
 */
export async function copyToClipboard (text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    try {
      document.execCommand('copy')
      document.body.removeChild(ta)
      return true
    } catch {
      document.body.removeChild(ta)
      return false
    }
  }
}

/**
 * Share to social media.
 */
export function shareTo (platform, url, text) {
  const encodedUrl = encodeURIComponent(url)
  const encodedText = encodeURIComponent(text)
  let shareUrl = ''

  switch (platform) {
    case 'twitter':
      shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`
      break
    case 'facebook':
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
      break
    case 'reddit':
      shareUrl = `https://reddit.com/submit?url=${encodedUrl}&title=${encodedText}`
      break
    case 'linkedin':
      shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
      break
    default:
      return
  }

  window.open(shareUrl, '_blank', 'width=600,height=400')
}

/**
 * Build a theme preview HTML for cards.
 */
export function buildPreviewSwatches (themeConfig = {}, uiThemeConfig = {}) {
  const colors = [
    uiThemeConfig.main || '#121214',
    uiThemeConfig.primary || '#08c',
    uiThemeConfig.success || '#06D6A0',
    uiThemeConfig.error || '#EF476F',
    uiThemeConfig.warn || '#FFD166',
    themeConfig.background || '#20111b',
    themeConfig.red || '#FF2C6D',
    themeConfig.green || '#19f9d8',
    themeConfig.blue || '#45A9F9',
    themeConfig.yellow || '#FFB86C',
    themeConfig.magenta || '#FF75B5',
    themeConfig.cyan || '#B084EB'
  ]
  return colors.map((c) => `<div class="theme-color-swatch" style="background:${c}"></div>`).join('')
}

/**
 * Format date.
 */
export function formatDate (dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}
