/**
 * Header interactions — mobile menu toggle, sticky header shadow,
 * and authenticated user menu (avatar + dropdown).
 */
import { fetchUser } from '../lib/auth.js'
import { initI18n } from './i18n-inline.js'

export function initHeader () {
  const toggle = document.querySelector('.mobile-menu-toggle')
  const nav = document.querySelector('.main-nav')

  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('open')
      toggle.setAttribute('aria-expanded', String(isOpen))
      toggle.classList.toggle('active', isOpen)
    })

    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        nav.classList.remove('open')
        toggle.setAttribute('aria-expanded', 'false')
        toggle.classList.remove('active')
      })
    })

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('open')) {
        nav.classList.remove('open')
        toggle.setAttribute('aria-expanded', 'false')
        toggle.classList.remove('active')
      }
    })
  }

  const header = document.querySelector('.site-header')
  if (header) {
    let ticking = false
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          if (window.scrollY > 4) {
            header.style.boxShadow = '0 1px 12px rgba(16,24,40,0.06)'
          } else {
            header.style.boxShadow = 'none'
          }
          ticking = false
        })
        ticking = true
      }
    })
  }

  // Initialize i18n engine
  initI18n()

  // Initialize user menu
  initUserMenu()
}

function getInitials (name) {
  const src = (name || '?').trim()
  if (!src) return '?'
  const parts = src.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

async function initUserMenu () {
  const userMenu = document.querySelector('.user-menu')
  const signInBtn = document.querySelector('.header-signin')
  if (!userMenu) return

  try {
    const user = await fetchUser()
    if (!user) return

    userMenu.classList.remove('hidden')
    if (signInBtn) signInBtn.classList.add('hidden')

    const avatarImg = userMenu.querySelector('.user-menu-avatar')
    const initialsEl = userMenu.querySelector('.user-menu-initials')

    if (user.avatarUrl) {
      if (avatarImg) {
        avatarImg.src = user.avatarUrl
        avatarImg.alt = user.name || ''
        avatarImg.classList.remove('hidden')
      }
      if (initialsEl) initialsEl.classList.add('hidden')
    } else {
      if (initialsEl) {
        initialsEl.textContent = getInitials(user.name)
        initialsEl.classList.remove('hidden')
      }
      if (avatarImg) avatarImg.classList.add('hidden')
    }

    initUserMenuDropdown(userMenu)
  } catch {
    // Not logged in
  }
}

function initUserMenuDropdown (userMenu) {
  const toggle = userMenu.querySelector('.user-menu-toggle')
  const dropdown = userMenu.querySelector('.user-menu-dropdown')
  if (!toggle || !dropdown) return

  toggle.addEventListener('click', (e) => {
    e.stopPropagation()
    const isOpen = !dropdown.hasAttribute('hidden')
    if (isOpen) {
      dropdown.setAttribute('hidden', '')
      userMenu.classList.remove('open')
      toggle.setAttribute('aria-expanded', 'false')
    } else {
      dropdown.removeAttribute('hidden')
      userMenu.classList.add('open')
      toggle.setAttribute('aria-expanded', 'true')
    }
  })

  document.addEventListener('click', (e) => {
    if (dropdown.hasAttribute('hidden')) return
    if (!userMenu.contains(e.target)) {
      dropdown.setAttribute('hidden', '')
      userMenu.classList.remove('open')
      toggle.setAttribute('aria-expanded', 'false')
    }
  })

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !dropdown.hasAttribute('hidden')) {
      dropdown.setAttribute('hidden', '')
      userMenu.classList.remove('open')
      toggle.setAttribute('aria-expanded', 'false')
    }
  })
}
