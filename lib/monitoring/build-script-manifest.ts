import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

/** Runs after compilation, before Next traces server files. No script contents are published. */
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
  writeFileSync(join(destination, 'client-scripts.json'), JSON.stringify(scripts))
  console.log(`Client error script manifest: ${Object.keys(scripts).length} own scripts (${relative(projectDir, destination)})`)
}
