#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const DEFAULT_MANIFEST = 'tests/manifests/live-lineup-consolidation.txt'
const EXPECTED_BRANCH = 'codex/nic-nac-trade-hardening'
const EXPECTED_REMOTE = 'https://github.com/louis623/sparkle-suite'
const FORBIDDEN = [
  'chrome-extension/',
  'artifacts/',
  'test-results/',
  'sites/',
  'apps/finder/',
  'lib/loc-control-center/',
  'tests/loc-waitlist.test.ts',
  'vault/',
]
const SECRET_PATTERNS = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bsk_live_[A-Za-z0-9]{20,}\b/,
  /\bgh[opsu]_[A-Za-z0-9]{20,}\b/,
  /\bsbp_[A-Za-z0-9]{20,}\b/,
  /\bAKIA[A-Z0-9]{16}\b/,
  /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/,
]

function fail(message) {
  throw new Error(`Consolidation patch refused: ${message}`)
}

function git(args, expected = [0]) {
  const result = spawnSync('git', args, { cwd: process.cwd(), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
  if (!expected.includes(result.status ?? -1)) {
    const detail = result.error?.message || result.stderr || result.stdout || 'no subprocess diagnostics'
    fail(`git ${args.join(' ')} exited ${result.status}: ${detail.trim()}`)
  }
  return (result.stdout || '').replaceAll('\r\n', '\n')
}

function readManifest(path) {
  const lines = readFileSync(path, 'utf8').split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#'))
  if (!lines.length) fail('scope manifest is empty')
  const seen = new Set()
  for (const entry of lines) {
    if (entry.includes('\\') || entry.startsWith('/') || entry.startsWith('./') || entry.split('/').some(part => !part || part === '.' || part === '..')) {
      fail(`non-canonical path ${entry}`)
    }
    if (FORBIDDEN.some(prefix => entry === prefix.slice(0, -1) || entry.startsWith(prefix))) fail(`forbidden path ${entry}`)
    const folded = entry.toLocaleLowerCase('en-US')
    if (seen.has(folded)) fail(`duplicate path ${entry}`)
    seen.add(folded)
  }
  const sorted = [...lines].sort()
  if (JSON.stringify(lines) !== JSON.stringify(sorted)) fail('scope manifest must be sorted')
  return lines
}

export function createConsolidationPatch(manifestPath = DEFAULT_MANIFEST) {
  const branch = git(['branch', '--show-current']).trim()
  const remote = git(['remote', 'get-url', 'origin']).trim().replace(/\/$/, '')
  const normalizedRemote = remote.replace(/\.git$/, '')
  if (branch !== EXPECTED_BRANCH) fail(`branch is ${branch || '(detached)'}`)
  if (normalizedRemote !== EXPECTED_REMOTE) fail(`origin is ${remote}`)
  const root = git(['rev-parse', '--show-toplevel']).trim().replaceAll('\\', '/')
  if (resolve(root) !== resolve(process.cwd())) fail(`run from repository root ${root}`)
  const manifest = readManifest(resolve(manifestPath))
  const tracked = new Set(git(['ls-files']).split('\n').filter(Boolean))
  const parts = []
  for (const path of manifest) {
    const status = git(['status', '--porcelain=v1', '--untracked-files=all', '--', path])
    if (!status.trim()) fail(`manifest path is not changed: ${path}`)
    const patch = tracked.has(path)
      ? git(['diff', '--binary', '--no-ext-diff', 'HEAD', '--', path])
      : git(['diff', '--binary', '--no-ext-diff', '--no-index', '--', '/dev/null', path], [0, 1])
    if (!patch.startsWith(`diff --git a/${path} b/${path}\n`)) fail(`unexpected patch header for ${path}`)
    parts.push(patch.endsWith('\n') ? patch : `${patch}\n`)
  }
  const patch = parts.join('')
  for (const forbidden of FORBIDDEN) {
    if (patch.includes(` a/${forbidden}`) || patch.includes(` b/${forbidden}`)) fail(`patch contains forbidden scope ${forbidden}`)
  }
  if (SECRET_PATTERNS.some(pattern => pattern.test(patch))) fail('patch matches a secret/credential signature')
  return {
    patch,
    evidence: {
      branch,
      remote,
      head: git(['rev-parse', 'HEAD']).trim(),
      manifest: resolve(manifestPath),
      files: manifest.length,
      bytes: Buffer.byteLength(patch),
      sha256: createHash('sha256').update(patch).digest('hex'),
    },
  }
}

function parseArguments(argv) {
  let manifest = DEFAULT_MANIFEST
  let verifyOnly = false
  for (const argument of argv) {
    if (argument === '--verify-only') verifyOnly = true
    else if (argument.startsWith('--manifest=')) manifest = argument.slice('--manifest='.length)
    else fail(`unsupported argument ${argument}`)
  }
  return { manifest, verifyOnly }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const options = parseArguments(process.argv.slice(2))
  const { patch, evidence } = createConsolidationPatch(options.manifest)
  if (options.verifyOnly) process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`)
  else {
    process.stderr.write(`${JSON.stringify(evidence)}\n`)
    process.stdout.write(patch)
  }
}
