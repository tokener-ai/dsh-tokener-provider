import React from 'react'
import { connect, CREDENTIAL } from './catalog.mjs'
const h = React.createElement
function TokenerSection({ api }) {
  const [key, setKey] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [message, setMessage] = React.useState('')
  const [failed, setFailed] = React.useState(false)
  const [connected, setConnected] = React.useState(false)
  const [skipped, setSkipped] = React.useState([])
  React.useEffect(() => {
    api.credentials.describe([CREDENTIAL]).then(result => setConnected(result.ok && result.value[CREDENTIAL]?.configured === true)).catch(() => {})
  }, [api])
  async function save(event) {
    event.preventDefault()
    setBusy(true)
    setFailed(false)
    setSkipped([])
    setMessage('Connecting to Tokener…')
    try {
      const result = await connect(api, key)
      setKey('')
      setConnected(true)
      setSkipped(result.skipped)
      setMessage(`Connected. ${result.count} chat models are available.${result.skipped.length ? ` ${result.skipped.length} models are not offered.` : ''}`)
    } catch (error) {
      setFailed(true)
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }
  return h('section', { style: { maxWidth: 680, padding: 24 } },
    h('h2', null, 'Tokener'),
    h('p', null, 'Connect your Tokener API key to use your available models.'),
    h('p', null, connected ? 'An API key is stored in the Harness credential store.' : 'Your API key stays in the Harness credential store.'),
    h('form', { onSubmit: save },
      h('label', { htmlFor: 'tokener-api-key' }, 'Tokener API key'),
      h('input', { id: 'tokener-api-key', type: 'password', autoComplete: 'off', spellCheck: false, value: key, disabled: busy,
        onChange: event => setKey(event.target.value), style: { display: 'block', width: '100%', boxSizing: 'border-box', padding: '10px 12px', margin: '8px 0 16px', border: '1px solid var(--border-color, #8886)', borderRadius: 8, background: 'transparent', color: 'inherit' } }),
      h('button', { type: 'submit', disabled: busy || !key.trim(), style: { padding: '8px 16px', borderRadius: 8, cursor: busy ? 'wait' : 'pointer' } }, busy ? 'Connecting…' : 'Connect and refresh models')),
    message && h('p', { role: failed ? 'alert' : 'status', 'aria-live': 'polite' }, message),
    skipped.length > 0 && h('ul', null, skipped.map(model => h('li', { key: model.id }, `${model.id}: ${model.reason}`))),
    h('p', null, 'Models need public catalog metadata with context and output limits, streaming, and tool support. Models without verified reasoning levels use the provider default.'),
    h('p', null, 'Select a model from the conversation model picker. To refresh the list, enter your API key and connect again.'))
}
export const inject = ['slots', 'remote.credentials', 'remote.settings', 'remote.llm']
export function apply(ctx) {
  const api = { credentials: ctx.get('remote.credentials'), settings: ctx.get('remote.settings'), llm: ctx.get('remote.llm') }
  ctx.get('slots').inject('settings.section', () => ctx.get('slots').register({
    name: 'settings.section', id: 'tokener-provider', order: 20, label: () => 'Tokener', inject: () => ({ api }),
  }, props => h(TokenerSection, props)))
}
