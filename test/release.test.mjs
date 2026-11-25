import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, delimiter } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { releaseMetadata, releaseState } from '../scripts/release.mjs'

const name = '@tokener-ai/dsh-tokener-provider'
const notes = '- Release contract fixture.'
const metadata = (version, changelog = `## v${version}\n\n${notes}\n`) => releaseMetadata(`v${version}`, { name, version }, changelog)
const registry = (versions = {}, tags = {}) => ({ versions, 'dist-tags': tags })

for (const [version, channel] of [['0.2.0-alpha.1', 'alpha'], ['0.2.0-beta.1', 'beta'], ['0.2.0-rc.1', 'rc'], ['0.2.0', 'latest']]) {
  test(`${version} selects only ${channel} before and after a stable release`, () => {
    const release = metadata(version)
    assert.equal(release.tag, channel)
    assert.equal(release.prerelease, channel !== 'latest')
    assert.equal(release.notes, notes)
    for (const state of [registry(), registry({ '0.1.0': {} }, { latest: '0.1.0', beta: '0.1.0-beta.9' })]) {
      assert.equal(releaseState(release, state, 1).tag, channel)
    }
  })
}

test('the release gate rejects malformed tags, version mismatches, and missing or empty notes', () => {
  for (const version of ['0.1.0-beta1', '01.0.0', '0.01.0', '0.1.00', '0.1.0-beta.01', '0.1.0-dev.1', '0.1.0+build', '0.1.0\n']) {
    assert.throws(() => metadata(version), /SemVer/)
  }
  assert.throws(() => releaseMetadata('0.1.0', { name, version: '0.1.0' }, ''), /SemVer/)
  assert.throws(() => releaseMetadata('v0.1.0', { name, version: '0.2.0' }, ''), /package.json/)
  assert.throws(() => metadata('0.1.0', '## v0.2.0\n\nOther notes'), /section/)
  assert.throws(() => metadata('0.1.0', '## v0.1.0\n\n## v0.2.0\n\nOther notes'), /empty/)
  assert.throws(() => metadata('0.1.0', '## v0.1.0\n\nNotes\n\n## v0.1.0\n\nDuplicate'), /section/)
  assert.equal(metadata('0.1.0', `# Changelog\r\n\r\n## v0.1.0\r\n\r\n${notes}\r\n\r\n## v0.0.1\r\n\r\nOlder notes`).notes, notes)
})

test('channel recovery rejects duplicate versions and numeric downgrades', () => {
  const release = metadata('0.2.0-beta.2')
  assert.throws(() => releaseState(release, registry({ [release.version]: {} }), 1), /already published/)
  assert.throws(() => releaseState(release, registry({}, { beta: '0.2.0-beta.10' }), 1), /backward/)
  assert.throws(() => releaseState(release, registry({ [release.version]: {} }, { beta: '0.2.0-beta.10' }), 2), /backward/)
  assert.equal(releaseState(release, registry({ [release.version]: {} }, { beta: release.version }), 2).resume, true)
  assert.equal(releaseState(metadata('0.2.0-beta.10'), registry({}, { beta: '0.2.0-beta.2' }), 1).resume, false)
})

test('the release CLI publishes and recovers only its selected channel and passes changelog notes to GitHub', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'dsh-release-'))
  const script = fileURLToPath(new URL('../scripts/release.mjs', import.meta.url))
  const callsPath = join(cwd, 'calls.jsonl')
  const tarball = 'isolated release tarball'
  const integrity = `sha512-${createHash('sha512').update(tarball).digest('base64')}`
  for (const command of ['npm', 'gh']) {
    writeFileSync(join(cwd, command), `#!/usr/bin/env node\nimport { appendFileSync } from 'node:fs'\nappendFileSync(process.env.RELEASE_CALLS, JSON.stringify(process.argv.slice(1)) + '\\n')\n`, { mode: 0o755 })
  }
  const run = (command, version) => spawnSync(process.execPath, [script, command], {
    cwd, encoding: 'utf8', env: { ...process.env, PATH: `${cwd}${delimiter}${process.env.PATH}`, RUNNER_TEMP: cwd,
      GITHUB_REF_NAME: `v${version}`, GITHUB_OUTPUT: join(cwd, 'output'), RELEASE_CALLS: callsPath },
  })
  const calls = () => readFileSync(callsPath, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line).slice(1))
  try {
    writeFileSync(join(cwd, 'package.json'), JSON.stringify({ name, type: 'module', version: '0.2.0' }))
    writeFileSync(join(cwd, 'CHANGELOG.md'), `## v0.2.0\n\n${notes}`)
    assert.notEqual(run('validate', '0.1.0').status, 0)
    for (const [version, channel] of [['0.2.0-alpha.1', 'alpha'], ['0.2.0-beta.1', 'beta'], ['0.2.0-rc.1', 'rc'], ['0.2.0', 'latest']]) {
      writeFileSync(join(cwd, 'package.json'), JSON.stringify({ name, type: 'module', version }))
      writeFileSync(join(cwd, 'CHANGELOG.md'), `## v${version}\n\n${notes}\n\n## v0.1.0\n\nOlder notes`)
      writeFileSync(callsPath, '')
      const state = releaseState(metadata(version), registry(), 1)
      writeFileSync(join(cwd, 'release-state.json'), JSON.stringify(state))
      writeFileSync(join(cwd, 'package.tgz'), tarball)
      for (const command of ['validate', 'publish', 'github']) {
        const result = run(command, version)
        assert.equal(result.status, 0, result.stderr)
      }
      assert.deepEqual(calls(), [
        ['publish', join(cwd, 'package.tgz'), '--access', 'public', '--tag', channel, '--provenance', '--ignore-scripts'],
        ['release', 'create', `v${version}`, '--verify-tag', '--notes-file', join(cwd, 'release-notes.md'),
          ...(channel === 'latest' ? ['--latest'] : ['--prerelease', '--latest=false'])],
      ])
      assert.equal(readFileSync(join(cwd, 'release-notes.md'), 'utf8'), `${notes}\n`)
      const resume = releaseState(metadata(version), registry({ [version]: { dist: { integrity } } }), 2)
      writeFileSync(callsPath, '')
      writeFileSync(join(cwd, 'release-state.json'), JSON.stringify(resume))
      assert.equal(run('publish', version).status, 0)
      assert.deepEqual(calls(), [['dist-tag', 'add', `${name}@${version}`, channel]])
      writeFileSync(callsPath, '')
      writeFileSync(join(cwd, 'release-state.json'), JSON.stringify({ ...resume, currentTags: { [channel]: version } }))
      assert.equal(run('publish', version).status, 0)
      assert.deepEqual(calls(), [])
      writeFileSync(join(cwd, 'package.tgz'), 'different tarball')
      const corrupt = run('publish', version)
      assert.notEqual(corrupt.status, 0)
      assert.match(corrupt.stderr, /does not match/)
      assert.deepEqual(calls(), [])
    }
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})
