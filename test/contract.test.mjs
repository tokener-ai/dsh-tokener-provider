import test from 'node:test'
import assert from 'node:assert/strict'
import { buildRoutes, connect, CREDENTIAL, CATALOG_URL, ENDPOINT } from '../src/catalog.mjs'

const model = (id, overrides = {}) => ({ id, label: id, provider: 'DeepSeek', modelType: 'llm', mode: 'chat', contextSize: 100000, maxOutputTokens: 8000, capabilities: ['streaming', 'tool_calling', 'reasoning'], ...overrides })
const catalog = (...models) => ({ schemaVersion: 1, catalogRevision: `sha256:${'a'.repeat(64)}`, models })
const fetchCatalog = async () => ({ ok: true, json: async () => catalog(model('deepseek-v4-flash')) })

function remote(models) {
  const calls = []
  return { calls, api: {
    llm: { async discoverModels(ns, request) { calls.push(['discover', ns, request]); return { ok: true, value: models } } },
    credentials: { async set(ref, key) { calls.push(['credential', ref, key]); return { ok: true } } },
    settings: { async mutate(ns, ops) { calls.push(['settings', ns, ops]); return { ok: true } } },
  } }
}

test('a validated key enters only credential storage, not route configuration', async () => {
  const { api, calls } = remote([{ id: 'deepseek-v4-flash' }])
  await connect(api, 'contract-key', async (url, options) => {
    assert.equal(url, CATALOG_URL)
    assert.equal(options.credentials, 'omit')
    assert.equal(options.redirect, 'error')
    assert.ok(!options.headers)
    assert.ok(!JSON.stringify([url, options]).includes('contract-key'))
    return fetchCatalog()
  })
  assert.equal(calls[0][0], 'discover')
  assert.equal(calls[0][2].baseURL, ENDPOINT)
  assert.deepEqual(calls[1], ['credential', CREDENTIAL, 'contract-key'])
  assert.equal(calls[2][0], 'settings')
  assert.ok(!JSON.stringify(calls[2]).includes('contract-key'))
})

test('rejected credentials leave existing credentials and routes unchanged and never echo the key', async () => {
  const { api, calls } = remote([])
  api.llm.discoverModels = async () => ({ ok: false, error: { message: 'contract-key' } })
  await assert.rejects(connect(api, 'contract-key', fetchCatalog), error => !error.message.includes('contract-key'))
  assert.equal(calls.length, 0)
})

test('live catalog joins only authorized models and routes new models without inventing reasoning controls', () => {
  const { routes, skipped, count } = buildRoutes([{ id: 'deepseek-v4-flash' }, { id: 'claude-opus-5' }, { id: 'future-chat' }, { id: 'missing' }], catalog(
    model('deepseek-v4-flash', { label: 'Live name', contextSize: 222222, maxOutputTokens: 1234, capabilities: ['streaming', 'tool_calling', 'vision', 'reasoning'] }),
    model('claude-opus-5', { provider: 'Anthropic' }), model('future-chat', { provider: 'XAI', label: '' }), model('not-authorized'),
  ))
  assert.equal(routes.tokener.api, 'openai-responses')
  assert.equal(routes['tokener-claude'].api, 'anthropic-messages')
  assert.equal(routes['tokener-claude'].baseURL, 'https://api.tokener.ai')
  assert.deepEqual(skipped.map(model => model.id), ['missing'])
  assert.equal(count, 3)
  assert.equal(routes.tokener.models[0].name, 'Live name')
  assert.equal(routes.tokener.models[0].contextWindow, 222222)
  assert.equal(routes.tokener.models[0].maxTokens, 1234)
  assert.deepEqual(routes.tokener.models[0].input, ['text', 'image'])
  assert.equal(routes.tokener.models[0].reasoningEfforts.high, 'high')
  assert.equal(routes.tokener.models[1].name, 'future-chat')
  assert.equal(routes.tokener.models[1].reasoningEfforts, false)
  assert.ok(!Object.values(routes).flatMap(route => route.models).some(model => model.id === 'not-authorized'))
})

test('incomplete catalog fields and non-chat or unsupported agent models never inherit host guesses', () => {
  const entries = [model('context', { contextSize: null }), model('output', { maxOutputTokens: null }), model('capabilities', { capabilities: null }), model('embedding', { modelType: 'text-embedding' }), model('no-tools', { capabilities: ['streaming'] }), model('invalid-size', { contextSize: -1 })]
  const { count, skipped, routes } = buildRoutes(entries, catalog(...entries))
  assert.equal(count, 0)
  assert.equal(skipped.length, entries.length)
  assert.ok(Object.values(routes).every(route => route === undefined))
})

test('catalog failure or incompatible versions leave the existing connection untouched', async () => {
  for (const failure of [async () => { throw new Error('contract-key') }, async () => ({ ok: false }), async () => ({ ok: true, json: async () => ({ ...catalog(model('deepseek-v4-flash')), schemaVersion: 2 }) })]) {
    const { api, calls } = remote([{ id: 'deepseek-v4-flash' }])
    await assert.rejects(connect(api, 'contract-key', failure), error => !error.message.includes('contract-key'))
    assert.deepEqual(calls.map(call => call[0]), ['discover'])
  }
})

test('an entirely incomplete catalog cannot overwrite the saved model list', async () => {
  const { api, calls } = remote([{ id: 'deepseek-v4-flash' }])
  await assert.rejects(connect(api, 'contract-key', async () => ({ ok: true, json: async () => catalog(model('deepseek-v4-flash', { maxOutputTokens: null })) })))
  assert.deepEqual(calls.map(call => call[0]), ['discover'])
})

test('credential storage failure cannot report a connected route', async () => {
  const { api, calls } = remote([{ id: 'deepseek-v4-flash' }])
  api.credentials.set = async () => ({ ok: false, error: { message: 'contract-key' } })
  await assert.rejects(connect(api, 'contract-key', fetchCatalog), error => !error.message.includes('contract-key'))
  assert.ok(!calls.some(call => call[0] === 'settings'))
})
