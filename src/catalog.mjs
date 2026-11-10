import { metadataFor } from './metadata.mjs'
export const ENDPOINT = 'https://api.tokener.ai/v1'
export const CREDENTIAL = 'TOKENER_API_KEY'
export const CATALOG_URL = 'https://console.tokener.ai/api/public/v1/models'
const catalogError = 'The public Tokener model catalog is unavailable or unsupported. Your saved connection was not changed.'
const positiveInteger = value => Number.isSafeInteger(value) && value > 0
export function buildRoutes(models, catalog) {
  if (catalog?.schemaVersion !== 1 || !/^sha256:[a-f0-9]{64}$/.test(catalog.catalogRevision) || !Array.isArray(catalog.models)) throw new Error(catalogError)
  const directory = new Map()
  for (const model of catalog.models) {
    if (!model || typeof model.id !== 'string' || !model.id || directory.has(model.id)) throw new Error(catalogError)
    directory.set(model.id, model)
  }
  const groups = { tokener: [], 'tokener-claude': [] }
  const skipped = []
  for (const id of [...new Set(models.map(model => model.id))]) {
    if (typeof id !== 'string' || !id) continue
    const model = directory.get(id)
    let reason
    if (!model) reason = 'No public catalog entry'
    else if (model.modelType !== 'llm' || model.mode !== 'chat') reason = 'Not a chat model'
    else if (!positiveInteger(model.contextSize) || !positiveInteger(model.maxOutputTokens)) reason = 'Context or output limit unavailable'
    else if (!Array.isArray(model.capabilities) || !model.capabilities.includes('streaming') || !model.capabilities.includes('tool_calling')) reason = 'Streaming tool support not declared'
    else if (typeof model.provider !== 'string' || !model.provider.trim()) reason = 'Model provider unavailable'
    if (reason) { skipped.push({ id, reason }); continue }
    const api = model.provider === 'Anthropic' ? 'anthropic-messages' : 'openai-responses'
    const controls = metadataFor(id)
    const entry = {
      id, name: typeof model.label === 'string' && model.label.trim() ? model.label : id,
      contextWindow: model.contextSize, maxTokens: model.maxOutputTokens,
      input: model.capabilities.includes('vision') ? ['text', 'image'] : ['text'],
      reasoningEfforts: model.capabilities.includes('reasoning') && controls?.api === api ? controls.reasoningEfforts : false,
    }
    groups[api === 'anthropic-messages' ? 'tokener-claude' : 'tokener'].push(entry)
  }
  const routes = Object.fromEntries(Object.entries(groups).map(([id, models]) => [id, models.length ? {
    displayName: id === 'tokener' ? 'Tokener' : 'Tokener · Claude',
    api: id === 'tokener' ? 'openai-responses' : 'anthropic-messages',
    baseURL: id === 'tokener' ? ENDPOINT : new URL(ENDPOINT).origin, apiKeyEnv: CREDENTIAL, models,
  } : undefined]))
  return { routes, skipped, count: Object.values(groups).reduce((total, models) => total + models.length, 0) }
}
export async function connect(api, key, fetchCatalog = globalThis.fetch) {
  const apiKey = key.trim()
  if (!apiKey) throw new Error('Enter a Tokener API key.')
  let models
  try {
    const response = await api.llm.discoverModels('llm-pi-ai', { baseURL: ENDPOINT, api: 'openai-responses', apiKey })
    if (!response.ok) throw new Error('Discovery failed')
    models = response.value
  } catch {
    throw new Error('Tokener did not accept the connection. Make sure that your API key and network connection work.')
  }
  let result
  try {
    const response = await fetchCatalog(CATALOG_URL, { credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(10_000) })
    if (!response.ok) throw new Error(catalogError)
    result = buildRoutes(models, await response.json())
  } catch {
    throw new Error(catalogError)
  }
  if (!result.count) throw new Error('No available models have complete chat metadata and streaming tool support. Your saved connection was not changed.')
  try {
    const credential = await api.credentials.set(CREDENTIAL, apiKey)
    if (!credential.ok) throw new Error('Credential storage failed')
    const saved = await api.settings.mutate('llm-pi-ai', Object.entries(result.routes).map(([id, route]) => route
      ? { op: 'set', path: ['providers', id], value: route }
      : { op: 'unset', path: ['providers', id] }), undefined)
    if (!saved.ok) throw new Error('Configuration storage failed')
  } catch {
    throw new Error('The connection worked, but saving failed. Reopen Settings and retry.')
  }
  return result
}
