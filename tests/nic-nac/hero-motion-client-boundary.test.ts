import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()
const PROFILE_MODULES = [
  'lib/mile-high-fizz/profile.ts',
  'lib/britt-with-bling/profile.ts',
]

function resolveImport(fromFile: string, specifier: string) {
  if (specifier.startsWith('@/')) return resolve(ROOT, `${specifier.slice(2)}.ts`)
  if (specifier.startsWith('.')) return resolve(dirname(fromFile), specifier)
  return null
}

function existing(path: string) {
  const candidates = [path, path.replace(/\.ts$/, '.tsx'), `${path}.ts`, `${path}.tsx`, join(path, 'index.ts'), join(path, 'index.tsx')]
  return candidates.find((candidate) => {
    try {
      readFileSync(candidate)
      return true
    } catch {
      return false
    }
  }) ?? null
}

function clientImports(source: string) {
  const withoutTypes = source
    .replace(/import\s+type\s+[\s\S]*?from\s+['"][^'"]+['"]/g, '')
    .replace(/export\s+type\s+[\s\S]*?from\s+['"][^'"]+['"]/g, '')
  return [...withoutTypes.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1])
}

function walk(entry: string) {
  const seen = new Set<string>()
  const queue = [resolve(ROOT, entry)]
  while (queue.length) {
    const file = queue.pop()
    if (!file || seen.has(file)) continue
    const actual = existing(file)
    if (!actual || actual.includes('node_modules')) continue
    seen.add(actual)
    let source = ''
    try {
      source = readFileSync(actual, 'utf8')
    } catch {
      continue
    }
    for (const specifier of clientImports(source)) {
      const next = resolveImport(actual, specifier)
      if (next) queue.push(next)
    }
  }
  return [...seen]
}

describe('hero motion client boundary', () => {
  it('keeps SiteSettingsBody from reaching the real profile modules', () => {
    const reached = walk('app/nic-nac/components/SiteSettingsBody.tsx')
      .map((file) => file.slice(ROOT.length + 1).replaceAll('\\', '/'))
    for (const profile of PROFILE_MODULES) {
      expect(reached, profile).not.toContain(profile)
    }
    expect(reached.some((file) => file.endsWith('hero-motion-applies.ts'))).toBe(false)
    expect(readFileSync('lib/mile-high-fizz/profile.ts', 'utf8')).toContain("import 'server-only'")
    expect(readFileSync('lib/britt-with-bling/profile.ts', 'utf8')).toContain("import 'server-only'")
    expect(readFileSync('lib/amethyst/hero-motion-applies.ts', 'utf8')).toContain("import 'server-only'")
  })
})
