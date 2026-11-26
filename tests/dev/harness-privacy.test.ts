import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const LIVE_REP_SLUGS = [
  'dudesfizzfest',
  'milehighfizz',
  'brittwithbling',
  'blingkitchen',
  'goforthebling',
  'maingemco',
  'sparklybutterflies',
  'brisglowtique',
  'blingwithkrissig',
]

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? filesUnder(path) : [path]
  })
}

describe('dev harness privacy', () => {
  it('keeps fictional sample data out of real emails, live slugs, and the founder headshot', () => {
    const files = filesUnder('app/dev')
    expect(files.length).toBeGreaterThan(0)
    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      const where = relative(process.cwd(), file)
      expect(source, where).not.toContain('@gmail.')
      expect(source, where).not.toContain('louis-headshot')
      for (const slug of LIVE_REP_SLUGS) {
        expect(source.toLowerCase(), `${where} ${slug}`).not.toContain(slug)
      }
    }
  })
})
