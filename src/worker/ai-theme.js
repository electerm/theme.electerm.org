/**
 * AI theme generation — pure, testable helpers.
 *
 * Pipeline:
 *   buildThemePrompt(description)
 *     -> AI chat/completions (callAi)
 *     -> parseAiThemeJson(rawText)
 *     -> normalizeAiTheme(...)   // fill defaults, fix invalid, strip unknowns
 *
 * The canonical theme schema (UI keys + terminal keys) and the default
 * colors are imported from the client theme lib so worker and client
 * never drift apart.
 */
import {
  defaultTheme,
  getUIColorKeys,
  getTerminalColorKeys
} from '../js/lib/theme.js'

export const UI_KEYS = getUIColorKeys()
export const TERMINAL_KEYS = getTerminalColorKeys()

/** Default fallback colors, split by section. */
function defaultColors () {
  const d = defaultTheme()
  return { terminal: d.themeConfig, ui: d.uiThemeConfig }
}

/**
 * Validate a single CSS color value.
 * Accepts hex (#rgb / #rrggbb / #rrggbbaa) and rgb()/rgba() with
 * numbers or percentages — enough for electerm theme colors.
 */
export function isValidColor (value) {
  if (typeof value !== 'string') return false
  const v = value.trim()
  if (!v) return false

  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v)) return true

  const m = /^rgba?\(([^)]+)\)$/i.exec(v)
  if (m) {
    const parts = m[1].split(',').map((s) => s.trim()).filter(Boolean)
    if (parts.length < 3 || parts.length > 4) return false
    const channel = /^(\d{1,3}%|\d*\.?\d+)$/
    const [r, g, b, a] = parts
    if (!channel.test(r) || !channel.test(g) || !channel.test(b)) return false
    if (a !== undefined && !channel.test(a)) return false
    return true
  }

  return false
}

/**
 * Safe JSON.parse with a fallback.
 */
function safeParse (str, fallback) {
  try {
    return JSON.parse(str) || fallback
  } catch {
    return fallback
  }
}

/**
 * Extract a JSON object from a raw AI response.
 * Strips markdown fences, surrounding prose, and trailing commas.
 * Returns the parsed object or null.
 */
export function parseAiThemeJson (text) {
  if (text == null) return null
  let s = String(text).trim()
  // strip a leading ```json / ``` fence and a trailing fence
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '')

  const first = s.indexOf('{')
  const last = s.lastIndexOf('}')
  if (first === -1 || last === -1 || last < first) return null

  const slice = s.slice(first, last + 1)
  const parsed = safeParse(slice, null)
  if (parsed) return parsed

  // retry after removing trailing commas before } or ]
  return safeParse(slice.replace(/,\s*([}\]])/g, '$1'), null)
}

/**
 * Normalize an AI theme output into a schema-conformant theme.
 *
 * Accepts either a raw string (AI response) or an already-parsed object.
 * Accepts both nested ({ name, themeConfig, uiThemeConfig }) and flat
 * ({ 'terminal:foreground': '#fff', main: '#000', themeName }) shapes.
 *
 * - missing keys are filled with defaults
 * - invalid color values are replaced with defaults
 * - unknown keys are stripped
 * - name is capped at 50 chars, defaults to 'AI Theme'
 */
export function normalizeAiTheme (input) {
  const d = defaultColors()

  const parsed = typeof input === 'string' ? parseAiThemeJson(input) : input
  let name = ''
  let termRaw = {}
  let uiRaw = {}

  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    if (parsed.themeConfig || parsed.uiThemeConfig) {
      name = typeof parsed.name === 'string'
        ? parsed.name
        : (typeof parsed.themeName === 'string' ? parsed.themeName : '')
      termRaw = parsed.themeConfig && typeof parsed.themeConfig === 'object' ? parsed.themeConfig : {}
      uiRaw = parsed.uiThemeConfig && typeof parsed.uiThemeConfig === 'object' ? parsed.uiThemeConfig : {}
    } else {
      // flat map: split by terminal: prefix
      for (const [k, v] of Object.entries(parsed)) {
        if (k === 'name' || k === 'themeName') {
          name = String(v)
          continue
        }
        if (k.startsWith('terminal:')) {
          termRaw[k.slice('terminal:'.length)] = v
        } else {
          uiRaw[k] = v
        }
      }
    }
  }

  const themeConfig = {}
  for (const key of TERMINAL_KEYS) {
    const val = termRaw[key]
    themeConfig[key] = isValidColor(val) ? String(val).trim() : d.terminal[key]
  }

  const uiThemeConfig = {}
  for (const key of UI_KEYS) {
    const val = uiRaw[key]
    uiThemeConfig[key] = isValidColor(val) ? String(val).trim() : d.ui[key]
  }

  let finalName = (name || '').trim()
  if (!finalName) finalName = 'AI Theme'
  if (finalName.length > 50) finalName = finalName.slice(0, 50)

  return { name: finalName, themeConfig, uiThemeConfig }
}

/**
 * Build the prompt sent to the AI model.
 */
export function buildThemePrompt (description) {
  const schema = {
    name: '<short theme name, max 50 chars>',
    themeConfig: Object.fromEntries(TERMINAL_KEYS.map((k) => [k, '#rrggbb'])),
    uiThemeConfig: Object.fromEntries(UI_KEYS.map((k) => [k, '#rrggbb']))
  }

  return [
    'You are a professional terminal color-scheme designer for the electerm terminal app.',
    'Design a cohesive, attractive, readable theme that matches the user description.',
    'Respond with ONLY a single JSON object — no markdown, no code fences, no explanation.',
    'The JSON MUST have EXACTLY this shape (every key is required, no extra keys):',
    JSON.stringify(schema),
    'Rules:',
    '- Every key above MUST be present; do not add any other key.',
    '- Color values must be valid CSS colors: hex like "#1e1e2e"/"#aabbcc", or "rgba(r,g,b,a)" only for selectionBackground.',
    '- terminal.foreground must contrast strongly with terminal.background for readability.',
    '- black,red,green,yellow,blue,magenta,cyan,white and their bright* variants form the ANSI palette — keep them coherent.',
    '- uiThemeConfig.main is the app background; text is main text; primary/info/success/error/warn are accents.',
    `User description: ${description}`
  ].join('\n')
}

/**
 * Resolve which model to call.
 * Priority: explicit env override > default provider's first model > fallback.
 *
 * `fetchImpl` is injected so this is unit-testable without network.
 */
export async function resolveAiModel ({ fetchImpl = fetch, apiKey, base, envModel }) {
  if (envModel) return envModel
  try {
    const auth = { headers: { Authorization: `Bearer ${apiKey}` } }
    const [cfgRes, provRes] = await Promise.all([
      fetchImpl(`${base}/config`, auth),
      fetchImpl(`${base}/providers`, auth)
    ])
    const cfg = await cfgRes.json().catch(() => ({}))
    const provData = await provRes.json().catch(() => ({}))
    const providers = provData.providers || []
    const def = providers.find((p) => p.id === cfg.defaultProviderId) || providers[0]
    const models = typeof def?.models === 'string' ? safeParse(def.models, []) : (def?.models || [])
    if (Array.isArray(models) && models.length) return models[0]
  } catch {
    // fall through to default
  }
  return 'mistral-small-latest'
}

/**
 * Call the AI chat/completions endpoint and return the raw message text.
 * `fetchImpl` is injected for testability.
 */
export async function callAi ({ fetchImpl = fetch, base, apiKey, model, description }) {
  const messages = [
    { role: 'system', content: 'You are a terminal theme designer that returns only valid JSON.' },
    { role: 'user', content: buildThemePrompt(description) }
  ]
  const res = await fetchImpl(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model, messages, stream: false, temperature: 0.8 })
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`AI service HTTP ${res.status}: ${txt}`)
  }
  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content) throw new Error('AI service returned empty content')
  return content
}
