/**
 * iframe control — postMessage communication with electerm demo site.
 * Adapted from electerm-web-demo/src/client/views/control.pug
 */

let _ready = false
let _pending = {}
let _pingTimer = null
let _iframe = null
let _onReady = null

/**
 * Initialize iframe control.
 * @param {HTMLIFrameElement} iframe
 * @param {Function} onReady - callback when iframe is ready
 */
export function initIframeControl (iframe, onReady) {
  _iframe = iframe
  _onReady = onReady
  _ready = false
  _pending = {}

  window.addEventListener('message', handleMessage)

  iframe.addEventListener('load', () => {
    setStatus('iframe loading...')
    ping()
    _pingTimer = setInterval(ping, 800)
  })
}

function setStatus (text, cls) {
  const el = document.getElementById('preview-status')
  if (el) {
    el.textContent = text
    el.className = 'preview-status' + (cls ? ' ' + cls : '')
  }
}

function handleMessage (e) {
  const msg = e.data
  if (!msg || msg.source !== 'demo-control') return

  if (msg.type === 'ready') {
    if (!_ready) {
      _ready = true
      clearPing()
      setStatus('iframe ready', 'ready')
      if (_onReady) _onReady()
    }
    return
  }

  if (msg.id && _pending[msg.id]) {
    const p = _pending[msg.id]
    delete _pending[msg.id]
    if (msg.ok) p.resolve(msg.result)
    else p.reject(new Error(msg.error))
  }
}

function clearPing () {
  if (_pingTimer) {
    clearInterval(_pingTimer)
    _pingTimer = null
  }
}

function ping () {
  if (_ready || !_iframe) return
  _iframe.contentWindow.postMessage(
    { source: 'parent-control', type: 'ping' },
    '*'
  )
}

/**
 * Call a store method on the demo iframe.
 */
export function callStore (method, ...args) {
  return new Promise((resolve, reject) => {
    if (!_ready || !_iframe) {
      reject(new Error('iframe not ready'))
      return
    }
    const id = Math.random().toString(36).slice(2)
    _pending[id] = { resolve, reject }
    _iframe.contentWindow.postMessage(
      { source: 'parent-control', method, args, id },
      '*'
    )
  })
}

/**
 * Apply theme config to the demo iframe.
 */
export function applyTheme (themeConfig, uiThemeConfig) {
  if (!_ready) return Promise.resolve()
  return callStore('setThemeConfig', themeConfig, uiThemeConfig)
}

/**
 * Check if iframe is ready.
 */
export function isIframeReady () {
  return _ready
}
