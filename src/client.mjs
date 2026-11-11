import React from 'react'
import { connect, CREDENTIAL } from './catalog.mjs'
import icon from './tokener.svg'
const h = React.createElement
function TokenerSection({ api, t }) {
  const [key, setKey] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [message, setMessage] = React.useState(null)
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
    setMessage({ key: 'connecting' })
    try {
      const result = await connect(api, key)
      setKey('')
      setConnected(true)
      setSkipped(result.skipped)
      setMessage({ key: 'connected', params: { count: result.count } })
    } catch (error) {
      setFailed(true)
      setMessage({ key: error.message })
    } finally {
      setBusy(false)
    }
  }
  return h('section', { style: { maxWidth: 680, padding: 24 } },
    h('h2', null, t('title')),
    h('p', null, h('a', { href: 'https://tokener.ai', target: '_blank', rel: 'noopener noreferrer', style: { color: 'var(--dsw-alias-link)', textDecoration: 'underline' } }, t('getKey'))),
    h('p', null, t(connected ? 'credentialSaved' : 'credential')),
    h('form', { onSubmit: save },
      h('label', { htmlFor: 'tokener-api-key' }, t('keyLabel')),
      h('input', { id: 'tokener-api-key', type: 'password', autoComplete: 'off', spellCheck: false, value: key, disabled: busy,
        onChange: event => setKey(event.target.value), style: { display: 'block', width: '100%', boxSizing: 'border-box', padding: '10px 12px', margin: '8px 0 16px', border: '1px solid var(--border-color, #8886)', borderRadius: 8, background: 'transparent', color: 'inherit' } }),
      h('button', { type: 'submit', disabled: busy || !key.trim(), style: { padding: '8px 16px', borderRadius: 8, cursor: busy ? 'wait' : 'pointer' } }, t(busy ? 'connecting' : 'connect'))),
    message && h('p', { role: failed ? 'alert' : 'status', 'aria-live': 'polite' }, t(message.key, message.params)),
    skipped.length > 0 && h(React.Fragment, null,
      h('p', null, t('excluded', { count: skipped.length })),
      h('ul', null, skipped.map(model => h('li', { key: model.id }, `${model.id}: ${t(model.reason)}`)))),
    h('p', null, t('usage')))
}
export const inject = ['slots', 'locale', 'remote.credentials', 'remote.settings', 'remote.llm']
export async function apply(ctx) {
  const { NS, dictionaries } = await require.async(TOKENER_LOCALE_CHUNK)
  const api = { credentials: ctx.get('remote.credentials'), settings: ctx.get('remote.settings'), llm: ctx.get('remote.llm') }
  const locale = ctx.get('locale')
  ctx.effect(() => locale.register(NS, dictionaries))
  const t = locale.bind(NS)
  ctx.get('slots').inject('settings.section', () => ctx.get('slots').register({
    name: 'settings.section', id: 'tokener-provider', order: 20, label: () => t('title'), locale: NS, inject: () => ({ api }),
  }, props => h(TokenerSection, props)))
  ctx.get('slots').inject('settings.section.icon', () => ctx.get('slots').register({
    name: 'settings.section.icon', id: 'tokener-provider',
  }, ({ size }) => h('span', { 'aria-hidden': true, style: { display: 'block', width: size, height: size, backgroundColor: 'currentColor', mask: `url(${JSON.stringify(icon)}) center / contain no-repeat` } })))
}
