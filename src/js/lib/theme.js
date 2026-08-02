/**
 * Theme config helpers — adapted from electerm's terminal-theme.js.
 * Handles conversion between text format and structured config objects.
 */

export const terminalPrefix = 'terminal:'

export const requiredThemeProps = [
  'main',
  'main-dark',
  'main-light',
  'text',
  'text-light',
  'text-dark',
  'text-disabled',
  'primary',
  'info',
  'success',
  'error',
  'warn',
  'terminal:foreground',
  'terminal:background',
  'terminal:cursor',
  'terminal:cursorAccent',
  'terminal:selectionBackground',
  'terminal:black',
  'terminal:red',
  'terminal:green',
  'terminal:yellow',
  'terminal:blue',
  'terminal:magenta',
  'terminal:cyan',
  'terminal:white',
  'terminal:brightBlack',
  'terminal:brightRed',
  'terminal:brightGreen',
  'terminal:brightYellow',
  'terminal:brightBlue',
  'terminal:brightMagenta',
  'terminal:brightCyan',
  'terminal:brightWhite'
]

export const validThemeProps = [
  ...requiredThemeProps,
  'name'
]

/**
 * Default dark theme terminal colors.
 */
function defaultThemeDarkTerminal () {
  return {
    foreground: '#bbbbbb',
    background: '#20111b',
    cursor: '#b5bd68',
    cursorAccent: '#1d1f21',
    selectionBackground: 'rgba(255, 255, 255, 0.3)',
    black: '#575757',
    red: '#FF2C6D',
    green: '#19f9d8',
    yellow: '#FFB86C',
    blue: '#45A9F9',
    magenta: '#FF75B5',
    cyan: '#B084EB',
    white: '#CDCDCD',
    brightBlack: '#757575',
    brightRed: '#FF2C6D',
    brightGreen: '#19f9d8',
    brightYellow: '#FFCC95',
    brightBlue: '#6FC1FF',
    brightMagenta: '#FF9AC1',
    brightCyan: '#BCAAFE',
    brightWhite: '#E6E6E6'
  }
}

function defaultThemeDarkUI () {
  return {
    'main-dark': '#000000',
    'main-light': '#2E3338',
    text: '#dddddd',
    'text-light': '#ffffff',
    'text-dark': '#888888',
    'text-disabled': '#777777',
    primary: '#08c',
    info: '#FFD166',
    success: '#06D6A0',
    error: '#EF476F',
    warn: '#E55934',
    main: '#121214'
  }
}

/**
 * Get default theme object.
 */
export function defaultTheme () {
  return {
    id: '',
    name: 'My Theme',
    themeConfig: defaultThemeDarkTerminal(),
    uiThemeConfig: defaultThemeDarkUI()
  }
}

/**
 * Convert theme object to text format.
 */
export function convertThemeToText (themeObj = {}, withName = false) {
  const theme = themeObj || {}
  const { themeConfig = {}, name, uiThemeConfig = {} } = theme
  const begin = withName
    ? `themeName=${name || ''}\n`
    : ''
  const res = Object.keys(uiThemeConfig).reduce((prev, key) => {
    return prev +
      (prev ? '\n' : '') +
      key + '=' + uiThemeConfig[key]
  }, begin)
  return Object.keys(themeConfig).reduce((prev, key) => {
    return prev +
      (prev ? '\n' : '') + terminalPrefix +
      key + '=' + themeConfig[key]
  }, res)
}

/**
 * Convert text format to theme config object.
 */
export function convertTheme (themeTxt) {
  return themeTxt.split('\n').reduce((prev, line) => {
    let [key = '', value = ''] = line.split('=')
    key = key.trim()
    value = value.trim()
    if (!key || !value) {
      return prev
    }
    if (key === 'themeName') {
      prev.name = value.slice(0, 50)
    } else {
      const isTerminal = key.startsWith(terminalPrefix)
      key = key.replace(terminalPrefix, '')
      if (key.includes('selection')) {
        key = 'selectionBackground'
      }
      if (isTerminal) {
        prev.themeConfig[key] = value
      } else {
        prev.uiThemeConfig[key] = value
      }
    }
    return prev
  }, {
    themeConfig: {},
    uiThemeConfig: {}
  })
}

/**
 * Get the list of UI color keys.
 */
export function getUIColorKeys () {
  return [
    'main', 'main-dark', 'main-light',
    'text', 'text-light', 'text-dark', 'text-disabled',
    'primary', 'info', 'success', 'error', 'warn'
  ]
}

/**
 * Get the list of terminal color keys (without prefix).
 */
export function getTerminalColorKeys () {
  return [
    'foreground', 'background', 'cursor', 'cursorAccent',
    'selectionBackground',
    'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
    'brightBlack', 'brightRed', 'brightGreen', 'brightYellow',
    'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite'
  ]
}

/**
 * Get a preview color array for theme cards.
 * Returns the most visually representative colors.
 */
export function getPreviewColors (uiThemeConfig = {}, themeConfig = {}) {
  return [
    uiThemeConfig.main || '#121214',
    uiThemeConfig.primary || '#08c',
    uiThemeConfig.success || '#06D6A0',
    uiThemeConfig.error || '#EF476F',
    uiThemeConfig.warn || '#FFD166',
    uiThemeConfig.info || '#B084EB',
    themeConfig.background || '#20111b',
    themeConfig.foreground || '#bbbbbb',
    themeConfig.red || '#FF2C6D',
    themeConfig.green || '#19f9d8',
    themeConfig.blue || '#45A9F9',
    themeConfig.yellow || '#FFB86C'
  ]
}
