import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'

export function releaseMetadata(tag, manifest, changelog) {
  const match = /^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-(alpha|beta|rc)\.(0|[1-9][0-9]*))?$/.exec(tag)
  if (!match || match[0] !== tag) throw new Error('Invalid SemVer release tag.')
  const version = tag.slice(1)
  if (manifest.version !== version) throw new Error('The tag must match the package.json version.')
  const sections = changelog.replaceAll('\r\n', '\n').split(/^## /m)
  const entries = sections.slice(1).filter(section => section.split('\n')[0] === tag)
  if (entries.length !== 1) throw new Error(`CHANGELOG.md must contain one ## ${tag} section.`)
  const notes = entries[0].slice(tag.length).trim()
  if (!notes) throw new Error('Release notes must not be empty.')
  return { spec: `${manifest.name}@${version}`, version, tag: match[5] ?? 'latest', prerelease: Boolean(match[5]), notes }
}

function compare(left, right) {
  const parse = value => value.split('+')[0].split(/-(.*)/s)
  const [leftCore, leftPre] = parse(left)
  const [rightCore, rightPre] = parse(right)
  const a = leftCore.split('.').map(BigInt)
  const b = rightCore.split('.').map(BigInt)
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1
  if (leftPre === rightPre) return 0
  if (leftPre === undefined || rightPre === undefined) return leftPre === undefined ? 1 : -1
  const x = leftPre.split('.')
  const y = rightPre.split('.')
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if (x[i] === y[i]) continue
    if (x[i] === undefined || y[i] === undefined) return x[i] === undefined ? -1 : 1
    const numericX = /^\d+$/.test(x[i])
    const numericY = /^\d+$/.test(y[i])
    if (numericX !== numericY) return numericX ? -1 : 1
    return numericX ? (BigInt(x[i]) > BigInt(y[i]) ? 1 : -1) : (x[i] > y[i] ? 1 : -1)
  }
  return 0
}

export function releaseState(release, metadata, attempt) {
  const published = metadata.versions[release.version]
  const resume = Boolean(published) && Number(attempt) > 1
  if (published && !resume) throw new Error('This version is already published. Rerun its original workflow to recover.')
  const current = metadata['dist-tags'][release.tag]
  if (current && (compare(release.version, current) < 0 || (!resume && compare(release.version, current) === 0))) {
    throw new Error(`Refusing to move ${release.tag} backward.`)
  }
  return { ...release, resume, integrity: published?.dist?.integrity, currentTags: metadata['dist-tags'] }
}

async function main(command) {
  const manifest = JSON.parse(readFileSync('package.json', 'utf8'))
  const release = releaseMetadata(process.env.GITHUB_REF_NAME, manifest, readFileSync('CHANGELOG.md', 'utf8'))
  const temp = process.env.RUNNER_TEMP
  if (command === 'validate') {
    console.log(`Validated ${release.spec}: ${release.tag}`)
  } else if (command === 'prepare') {
    const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(manifest.name)}`, {
      signal: AbortSignal.timeout(30000),
    })
    if (!response.ok) throw new Error(`Registry lookup failed: ${response.status}`)
    const state = releaseState(release, await response.json(), process.env.GITHUB_RUN_ATTEMPT)
    writeFileSync(`${temp}/release-state.json`, JSON.stringify(state))
    console.log(`${state.resume ? 'Recover' : 'Publish'} ${state.spec} with channel ${state.tag}`)
  } else if (command === 'publish') {
    const state = JSON.parse(readFileSync(`${temp}/release-state.json`, 'utf8'))
    if (state.resume) {
      const integrity = `sha512-${createHash('sha512').update(readFileSync(`${temp}/package.tgz`)).digest('base64')}`
      if (integrity !== state.integrity) throw new Error('Recovery refused: the published package does not match this release tarball.')
      if (state.currentTags[release.tag] !== release.version) {
        execFileSync('npm', ['dist-tag', 'add', release.spec, release.tag], { stdio: 'inherit' })
      }
    } else {
      execFileSync('npm', ['publish', `${temp}/package.tgz`, '--access', 'public', '--tag', release.tag, '--provenance', '--ignore-scripts'], { stdio: 'inherit' })
    }
    console.log(`Release channel complete: ${release.tag}`)
  } else if (command === 'github') {
    const notesPath = `${temp}/release-notes.md`
    writeFileSync(notesPath, `${release.notes}\n`)
    execFileSync('gh', ['release', 'create', process.env.GITHUB_REF_NAME, '--verify-tag', '--notes-file', notesPath,
      ...(release.prerelease ? ['--prerelease', '--latest=false'] : ['--latest'])], { stdio: 'inherit' })
  } else {
    throw new Error('Use validate, prepare, publish, or github.')
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main(process.argv[2])
}
