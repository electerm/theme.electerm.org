/**
 * Tests for the AI theme generator.
 *
 * Two layers:
 *   1. Offline unit tests — validation, JSON extraction, normalization,
 *      prompt building, model resolution. Always run.
 *   2. Integration test — calls the real ai.electerm.org service (via the
 *      electerm-online proxy using ELECTERM_ONLINE_API_KEY) and asserts the
 *      normalized result is schema-conformant. Skipped when the key is absent.
 *
 * Run: npm test
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import {
  isValidColor,
  parseAiThemeJson,
  normalizeAiTheme,
  buildThemePrompt,
  resolveAiModel,
  callAi,
  UI_KEYS,
  TERMINAL_KEYS
} from '../src/worker/ai-theme.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// --- minimal env loader (no dotenv dependency) ----------------------------
// Loads .env then .dev.vars (Cloudflare local secrets format KEY=VALUE).
function loadEnv () {
  for (const file of ['.env', '.dev.vars']) {
    try {
      const raw = readFileSync(join(ROOT, file), 'utf8')
      for (const line of raw.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eq = trimmed.indexOf('=')
        if (eq === -1) continue
        const key = trimmed.slice(0, eq).trim()
        let value = trimmed.slice(eq + 1).trim()
        value = value.replace(/\s+#.*$/, '').replace(/^["']|["']$/g, '')
        if (!(key in process.env)) process.env[key] = value
      }
    } catch {
      // file optional
    }
  }
}
loadEnv()

const AI_API_KEY = process.env.ELECTERM_ONLINE_API_KEY
const AI_BASE_URL = (process.env.AI_API_BASE_URL || 'https://ai.electerm.org/api/electerm-online').replace(/\/+$/, '')

// ===========================================================================
// 1. isValidColor
// ===========================================================================
test('isValidColor: accepts hex colors', () => {
  assert.ok(isValidColor('#fff'))
  assert.ok(isValidColor('#1e1e2e'))
  assert.ok(isValidColor('#aabbccff'))
})

test('isValidColor: accepts rgb/rgba', () => {
  assert.ok(isValidColor('rgb(255, 255, 255)'))
  assert.ok(isValidColor('rgba(255,255,255,0.3)'))
  assert.ok(isValidColor('rgba(100%, 0%, 0%, 0.5)'))
})

test('isValidColor: rejects garbage', () => {
  assert.ok(!isValidColor('not a color'))
  assert.ok(!isValidColor('#gggggg'))
  assert.ok(!isValidColor('#12'))
  assert.ok(!isValidColor(''))
  assert.ok(!isValidColor(null))
  assert.ok(!isValidColor(undefined))
  assert.ok(!isValidColor(123))
})

// ===========================================================================
// 2. parseAiThemeJson
// ===========================================================================
test('parseAiThemeJson: plain json', () => {
  assert.deepEqual(parseAiThemeJson('{"a":1}'), { a: 1 })
})

test('parseAiThemeJson: strips markdown fences', () => {
  assert.deepEqual(parseAiThemeJson('```json\n{"a":1}\n```'), { a: 1 })
  assert.deepEqual(parseAiThemeJson('```\n{"a":1}\n```'), { a: 1 })
})

test('parseAiThemeJson: ignores surrounding prose', () => {
  assert.deepEqual(parseAiThemeJson('Here is the theme:\n{"a":1}\nHope you like it.'), { a: 1 })
})

test('parseAiThemeJson: fixes trailing commas', () => {
  assert.deepEqual(parseAiThemeJson('{"a":1, "b":2,}'), { a: 1, b: 2 })
})

test('parseAiThemeJson: returns null on invalid input', () => {
  assert.equal(parseAiThemeJson('not json at all'), null)
  assert.equal(parseAiThemeJson(''), null)
  assert.equal(parseAiThemeJson(null), null)
})

// ===========================================================================
// 3. normalizeAiTheme
// ===========================================================================
test('normalizeAiTheme: passes through a fully valid nested theme', () => {
  const input = {
    name: 'My Theme',
    themeConfig: Object.fromEntries(TERMINAL_KEYS.map((k) => [k, '#112233'])),
    uiThemeConfig: Object.fromEntries(UI_KEYS.map((k) => [k, '#445566']))
  }
  const out = normalizeAiTheme(input)
  assert.equal(out.name, 'My Theme')
  for (const k of TERMINAL_KEYS) assert.equal(out.themeConfig[k], '#112233', `terminal ${k}`)
  for (const k of UI_KEYS) assert.equal(out.uiThemeConfig[k], '#445566', `ui ${k}`)
})

test('normalizeAiTheme: result always has exactly the schema keys', () => {
  const out = normalizeAiTheme({ name: 'x' })
  assert.deepEqual(Object.keys(out.themeConfig).sort(), [...TERMINAL_KEYS].sort())
  assert.deepEqual(Object.keys(out.uiThemeConfig).sort(), [...UI_KEYS].sort())
})

test('normalizeAiTheme: fills missing keys with defaults', () => {
  const out = normalizeAiTheme({ name: 'partial', themeConfig: { foreground: '#abcdef' }, uiThemeConfig: {} })
  assert.equal(out.themeConfig.foreground, '#abcdef')
  // every other terminal key got a default (non-empty valid color)
  for (const k of TERMINAL_KEYS) {
    if (k === 'foreground') continue
    assert.ok(isValidColor(out.themeConfig[k]), `default for ${k} should be valid`)
  }
  for (const k of UI_KEYS) assert.ok(isValidColor(out.uiThemeConfig[k]), `default ui for ${k}`)
})

test('normalizeAiTheme: replaces invalid color values with defaults', () => {
  const out = normalizeAiTheme({
    themeConfig: { foreground: 'banana', background: '#000000' },
    uiThemeConfig: { main: '!!!', text: '#111111' }
  })
  // 'banana' invalid -> default; background kept
  assert.notEqual(out.themeConfig.foreground, 'banana')
  assert.ok(isValidColor(out.themeConfig.foreground))
  assert.equal(out.themeConfig.background, '#000000')
  assert.notEqual(out.uiThemeConfig.main, '!!!')
  assert.ok(isValidColor(out.uiThemeConfig.main))
  assert.equal(out.uiThemeConfig.text, '#111111')
})

test('normalizeAiTheme: strips unknown keys', () => {
  const out = normalizeAiTheme({
    themeConfig: { foreground: '#100000', hax: '#000' },
    uiThemeConfig: { main: '#000000', extra: '#fff' }
  })
  assert.ok(!('hax' in out.themeConfig))
  assert.ok(!('extra' in out.uiThemeConfig))
})

test('normalizeAiTheme: handles flat text-format shape', () => {
  const out = normalizeAiTheme({
    themeName: 'Flat',
    'terminal:foreground': '#aabbcc',
    'terminal:background': '#000000',
    main: '#222222',
    text: '#eeeeee'
  })
  assert.equal(out.name, 'Flat')
  assert.equal(out.themeConfig.foreground, '#aabbcc')
  assert.equal(out.themeConfig.background, '#000000')
  assert.equal(out.uiThemeConfig.main, '#222222')
  assert.equal(out.uiThemeConfig.text, '#eeeeee')
})

test('normalizeAiTheme: accepts a raw AI string', () => {
  const raw = '```json\n{"name":"Sunset","themeConfig":{"foreground":"#fff","background":"#000"},"uiThemeConfig":{"main":"#111"}}\n```'
  const out = normalizeAiTheme(raw)
  assert.equal(out.name, 'Sunset')
  assert.equal(out.themeConfig.foreground, '#fff')
  assert.equal(out.themeConfig.background, '#000')
  assert.equal(out.uiThemeConfig.main, '#111')
})

test('normalizeAiTheme: defaults + caps the name', () => {
  assert.equal(normalizeAiTheme({}).name, 'AI Theme')
  const long = 'x'.repeat(120)
  assert.equal(normalizeAiTheme({ name: long }).name.length, 50)
})

test('normalizeAiTheme: every output color is valid', () => {
  // feed it garbage + partial data; every emitted color must be valid
  const out = normalizeAiTheme('{"themeConfig":{"foreground":"nope"},"uiThemeConfig":{"main":42}}')
  for (const k of TERMINAL_KEYS) assert.ok(isValidColor(out.themeConfig[k]), `terminal ${k}`)
  for (const k of UI_KEYS) assert.ok(isValidColor(out.uiThemeConfig[k]), `ui ${k}`)
})

// ===========================================================================
// 4. buildThemePrompt
// ===========================================================================
test('buildThemePrompt: includes schema keys and the description', () => {
  const prompt = buildThemePrompt('a calm ocean theme')
  assert.ok(prompt.includes('a calm ocean theme'))
  for (const k of TERMINAL_KEYS) assert.ok(prompt.includes(k), `prompt mentions terminal key ${k}`)
  for (const k of UI_KEYS) assert.ok(prompt.includes(k), `prompt mentions ui key ${k}`)
})

// ===========================================================================
// 5. resolveAiModel
// ===========================================================================
test('resolveAiModel: env override wins', async () => {
  const model = await resolveAiModel({
    fetchImpl: async () => { throw new Error('should not be called') },
    apiKey: 'k',
    base: AI_BASE_URL,
    envModel: 'my-model'
  })
  assert.equal(model, 'my-model')
})

test('resolveAiModel: picks default provider first model from mock', async () => {
  const mockFetch = async (url) => {
    if (url.endsWith('/config')) {
      return { ok: true, json: async () => ({ defaultProviderId: 'p2' }) }
    }
    if (url.endsWith('/providers')) {
      return {
        ok: true,
        json: async () => ({
          providers: [
            { id: 'p1', models: '["m-a"]' },
            { id: 'p2', models: '["m-b","m-c"]' }
          ]
        })
      }
    }
    throw new Error('unexpected url ' + url)
  }
  const model = await resolveAiModel({ fetchImpl: mockFetch, apiKey: 'k', base: AI_BASE_URL })
  assert.equal(model, 'm-b')
})

test('resolveAiModel: falls back when fetch fails', async () => {
  const model = await resolveAiModel({
    fetchImpl: async () => { throw new Error('network down') },
    apiKey: 'k',
    base: AI_BASE_URL
  })
  assert.equal(model, 'mistral-small-latest')
})

// ===========================================================================
// 6. Integration — real AI service (skipped without a key)
// ===========================================================================
const itIf = AI_API_KEY ? test : test.skip

itIf('integration: generates a schema-valid theme from a description', async () => {
  const model = await resolveAiModel({ apiKey: AI_API_KEY, base: AI_BASE_URL })
  assert.ok(model, 'a model must be resolved')

  const raw = await callAi({ base: AI_BASE_URL, apiKey: AI_API_KEY, model, description: 'a warm sunset desert theme, dark background with orange and pink accents' })
  assert.ok(raw, 'AI must return content')

  const theme = normalizeAiTheme(raw)

  // name
  assert.ok(typeof theme.name === 'string' && theme.name.length > 0)
  assert.ok(theme.name.length <= 50)

  // exact schema keys
  assert.deepEqual(Object.keys(theme.themeConfig).sort(), [...TERMINAL_KEYS].sort())
  assert.deepEqual(Object.keys(theme.uiThemeConfig).sort(), [...UI_KEYS].sort())

  // every color valid
  for (const k of TERMINAL_KEYS) assert.ok(isValidColor(theme.themeConfig[k]), `terminal ${k} = ${theme.themeConfig[k]}`)
  for (const k of UI_KEYS) assert.ok(isValidColor(theme.uiThemeConfig[k]), `ui ${k} = ${theme.uiThemeConfig[k]}`)
})
