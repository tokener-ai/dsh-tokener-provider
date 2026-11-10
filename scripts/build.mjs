import { build } from 'esbuild'
import { readFile, writeFile } from 'node:fs/promises'
const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url)))
await build({
  entryPoints: ['src/client.mjs'],
  outfile: 'lib/client.js',
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  external: ['react'],
  minify: true,
  legalComments: 'none',
  banner: { js: `window.__ModuleLoader__.load({id:${JSON.stringify(manifest.name)},factory:require=>{var module={exports:{}};var exports=module.exports;` },
  footer: { js: 'return module.exports}});' },
})
await writeFile('cordis.patch.yml', `- insert:\n    - id: tokener-provider\n      name: ${JSON.stringify(manifest.name)}\n`)
