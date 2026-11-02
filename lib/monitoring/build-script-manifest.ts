import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'

/** Runs after compilation. No script contents are published. */
export function writeClientScriptManifest(distDir: string, projectDir: string) {
  const scripts: Record<string, number[]> = {}
  function visit(directory: string, prefix: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = join(directory, entry.name)
      if (entry.isDirectory()) visit(file, `${prefix}/${entry.name}`)
      else if (entry.name.endsWith('.js') && entry.name !== 'react.js') {
        scripts[`${prefix}/${entry.name}`] = readFileSync(file, 'utf8').split('\n').map(line => line.length)
      }
    }
  }
  visit(join(distDir, 'static', 'chunks'), '/_next/static/chunks')
  visit(join(projectDir, 'public', 'amethyst'), '/amethyst')
  const destination = join(projectDir, 'lib', 'monitoring', 'generated')
  mkdirSync(destination, { recursive: true })
  const manifestFile = join(destination, 'client-scripts.json')
  writeFileSync(manifestFile, JSON.stringify(scripts))
  // Next 16 Turbopack emits NFT traces DURING compilation, before this hook.
  // Explicitly include this newly generated asset in the route's existing trace.
  // Fail the build if the expected trace is absent, rather than silently ship
  // a monitoring endpoint that cannot validate any scripts.
  const traceFile = join(distDir, 'server', 'app', 'api', 'public', 'client-error', 'route.js.nft.json')
  const trace = JSON.parse(readFileSync(traceFile, 'utf8'))
  if (trace.version !== 1 || !Array.isArray(trace.files)) throw new Error('Unsupported client-error file trace')
  trace.files = [...new Set([...trace.files, relative(dirname(traceFile), manifestFile).replaceAll('\\', '/')])]
  writeFileSync(traceFile, JSON.stringify(trace))
  console.log(`Client error script manifest: ${Object.keys(scripts).length} own scripts (${relative(projectDir, destination)})`)
}
