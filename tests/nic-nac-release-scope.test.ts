import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const manifestPath = path.resolve(
  'tests/manifests/nic-nac-photo-rarity-release.txt',
)
const files = readFileSync(manifestPath, 'utf8')
  .split(/\r?\n/)
  .map((entry) => entry.trim())
  .filter(Boolean)

const protectedPatterns = [
  /live-lineup/i,
  /live_lineup/i,
  /sparkle-extension/i,
  /required-setup/i,
  /reviewer-smoke/i,
  /^app\/api\/live-lineup\//,
  /^app\/api\/workspace\//,
  /^app\/nic-nac\/components\/LiveLineup/,
  /^sites\//,
  /kelly/i,
  /^supabase\/migrations\/20260910/,
]

describe('isolated Nic-Nac photo and rarity release scope', () => {
  it('contains unique, normalized repository paths', () => {
    expect(files.length).toBeGreaterThan(0)
    expect(new Set(files).size).toBe(files.length)
    expect(files.every((entry) => !entry.includes('\\'))).toBe(true)
    expect(files).toEqual([...files].sort((left, right) => left.localeCompare(right)))
    expect(files.every((entry) => existsSync(path.resolve(entry)))).toBe(true)
  })

  it('cannot include protected Live Lineup, extension, reviewer, or Kelly work', () => {
    for (const file of files) {
      expect(
        protectedPatterns.some((pattern) => pattern.test(file)),
        `protected path entered release manifest: ${file}`,
      ).toBe(false)
    }
  })

  it('pins the migration, repair tooling, public mapping, Suite core, and Finder flow', () => {
    expect(files).toEqual(
      expect.arrayContaining([
        'supabase/migrations/20260913000100_nic_nac_photo_rarity_hardening.sql',
        'scripts/repair-nic-nac-listings.ts',
        'lib/nic-nac/workflows/workflow-photo-selection.ts',
        'lib/services/jewelry-rarity.ts',
        'lib/amethyst/trade-board-listings.ts',
        'apps/finder/components/showcase/ShowcaseStudioIntakePanel.tsx',
      ]),
    )
  })

  it('identifies the only two paths overlapping the protected Lineup commits', () => {
    const protectedFiles = new Set(
      execFileSync(
        'git',
        [
          'diff',
          '--name-only',
          'd77b64a2b3a760f75fbaa61bf05c5b871706756a..89087998686952a0347f4391f7028e7a3ad657db',
        ],
        { encoding: 'utf8' },
      )
        .split(/\r?\n/)
        .filter(Boolean),
    )
    expect(files.filter((entry) => protectedFiles.has(entry))).toEqual([
      'lib/services/types.ts',
      'tests/amethyst-trade-template.test.ts',
    ])
    expect(
      execFileSync('git', ['hash-object', 'lib/services/types.ts'], {
        encoding: 'utf8',
      }).trim(),
    ).toBe('6365a30fffa58ca674270828a489f3a92cbaef65')
    expect(
      execFileSync('git', ['hash-object', 'tests/amethyst-trade-template.test.ts'], {
        encoding: 'utf8',
      }).trim(),
    ).toBe('e416d27f3358d00541ea552cd6b529619d76ec23')
  })
})
