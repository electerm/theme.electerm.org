/**
 * 404 page — just initializes header and i18n.
 */
import { initHeader } from '../parts/header.js'

function init () {
  initHeader()
}

document.addEventListener('DOMContentLoaded', init)
