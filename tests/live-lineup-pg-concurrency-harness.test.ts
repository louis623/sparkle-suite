import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// CLI/safety checks only. These deliberately never execute psql and are not
// evidence of PostgreSQL concurrency. The guarded Linux fixture provides that.
const script = resolve('scripts/live-lineup-pg-concurrency.mjs')
const base = ['--fixture-root=/tmp/sparkle-lineup-pg.123456', '--user=louis623', '--dry-run']
function run(args: string[]) {
  return spawnSync(process.execPath, [script, ...args], {encoding:'utf8', timeout:5000})
}
describe('isolated PostgreSQL harness CLI', () => {
  it('parses in the installed Node runtime', () => {
    expect(spawnSync(process.execPath, ['--check', script]).status).toBe(0)
  })
  it('dry-runs without a socket or PG connection and reports the exact draft hash', () => {
    const result = run(base)
    expect(result.status).toBe(0)
    const plan = JSON.parse(result.stdout.split('\n')[0])
    expect(plan).toMatchObject({mode:'dry-run', database:'sparkle_lineup_concurrency', socket:'/tmp/sparkle-lineup-pg.123456/socket', port:'55439'})
    expect(plan.migrationSha256).toBe(createHash('sha256').update(readFileSync('supabase/migrations/20260910000100_live_lineup_v2.sql')).digest('hex'))
    expect(plan.reviewerMigrationSha256).toBe(createHash('sha256').update(readFileSync('supabase/migrations/20260910000200_reviewer_live_lineup_reset.sql')).digest('hex'))
    expect(plan.cases).toContain('reviewer reset/publisher issuance, both lock orders')
    expect(result.stdout).toContain('no psql subprocess or database connection was created')
  })
  it.each([
    ['--fixture-root=/tmp', '--user=louis623', '--dry-run'],
    ['--fixture-root=/tmp/sparkle-lineup-pg.123456/../other', '--user=louis623', '--dry-run'],
    ['--fixture-root=postgres://provider/database', '--user=louis623', '--dry-run'],
    ['--fixture-root=/tmp/sparkle-lineup-pg.123456', '--user=postgres host=provider', '--dry-run'],
    [...base, '--host=provider'],
    [...base, '--database=postgres'],
    [...base, '--user=postgres'],
    [...base, '--migration=package.json'],
    [...base, '--reviewer-migration=package.json'],
  ])('rejects unapproved or ambiguous arguments: %j', (...args) => {
    const result = run(args)
    expect(result.status).not.toBe(0)
    expect(result.stdout).not.toContain('DRY RUN ONLY')
  })
})
