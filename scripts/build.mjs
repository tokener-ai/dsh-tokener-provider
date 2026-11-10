import { build } from 'esbuild'
import { createHash } from 'node:crypto'
import { readFile, readdir, unlink, writeFile } from 'node:fs/promises'
const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url)))
const localeSource = await readFile(new URL('../src/locales.mjs', import.meta.url))
const localeChunk = `client.locales-${createHash('sha256').update(localeSource).digest('hex').slice(0, 12)}.js`
const factory = `factory:require=>{var module={exports:{}};var exports=module.exports;`
for (const name of await readdir('lib')) {
  if (/^client\.locales-[a-f0-9]{12}\.js$/.test(name)) await unlink(`lib/${name}`)
}
await build({
  entryPoints: ['src/locales.mjs'],
  outfile: `lib/${localeChunk}`,
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  charset: 'utf8',
  minify: true,
  legalComments: 'none',
  banner: { js: `window.__ModuleLoader__.load({id:${JSON.stringify(manifest.name)},chunk:${JSON.stringify(localeChunk)},${factory}` },
  footer: { js: 'return module.exports}});' },
})
await build({
  entryPoints: ['src/client.mjs'],
  outfile: 'lib/client.js',
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  charset: 'utf8',
  external: ['react'],
  loader: { '.svg': 'dataurl' },
  define: { TOKENER_LOCALE_CHUNK: JSON.stringify(`./${localeChunk}`) },
  minify: true,
  legalComments: 'none',
  banner: { js: `window.__ModuleLoader__.load({id:${JSON.stringify(manifest.name)},${factory}` },
  footer: { js: 'return module.exports}});' },
})
await writeFile('cordis.patch.yml', `- insert:\n    - id: tokener-provider\n      name: ${JSON.stringify(manifest.name)}\n`)
