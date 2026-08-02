/**
 * Legal pages (privacy policy, terms of use).
 * Header + i18n bootstrap only — content is server-rendered and
 * switched client-side via the embedded i18n data.
 */
import { initHeader } from '../parts/header.js'

function init () {
  initHeader()
}

document.addEventListener('DOMContentLoaded', init)
