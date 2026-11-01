import { expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { writeClientScriptManifest } from '@/lib/monitoring/build-script-manifest'

it('packages the post-compile manifest in the already emitted route trace and fails if that trace is missing', () => {
  const project = mkdtempSync(join(tmpdir(), 'client-error-build-test-'))
  try {
    const dist = join(project, '.next')
    const chunk = join(dist, 'static', 'chunks', 'own.js')
    const runtime = join(project, 'public', 'amethyst', 'own.js')
    const traceFile = join(dist, 'server', 'app', 'api', 'public', 'client-error', 'route.js.nft.json')
    for (const file of [chunk, runtime, traceFile]) mkdirSync(dirname(file), { recursive: true })
    writeFileSync(chunk, 'first\nsecond'); writeFileSync(runtime, 'own')
    writeFileSync(traceFile, JSON.stringify({ version: 1, files: ['existing.js'] }))
    writeClientScriptManifest(dist, project)
    const manifestFile = join(project, 'lib', 'monitoring', 'generated', 'client-scripts.json')
    expect(JSON.parse(readFileSync(manifestFile, 'utf8'))).toEqual({ '/_next/static/chunks/own.js': [5, 6], '/amethyst/own.js': [3] })
    const traced = JSON.parse(readFileSync(traceFile, 'utf8')).files
    expect(traced).toContain('existing.js')
    expect(traced.map((file: string) => resolve(dirname(traceFile), file))).toContain(manifestFile)
    rmSync(traceFile)
    expect(() => writeClientScriptManifest(dist, project)).toThrow()
  } finally { rmSync(project, { recursive: true, force: true }) }
})
