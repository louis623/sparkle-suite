import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationsDir = path.join(process.cwd(), 'supabase/migrations')
const schemaPath = path.join(migrationsDir, '006_sparkle_suite_schema.sql')

describe('subscriptions.rep_id uniqueness', () => {
  it('creates subscriptions.rep_id as UNIQUE NOT NULL in the original schema', () => {
    const sql = readFileSync(schemaPath, 'utf8')
    const start = sql.indexOf('CREATE TABLE subscriptions (')
    const end = sql.indexOf('CREATE TABLE onboarding_status')
    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
    const table = sql.slice(start, end)
    expect(table).toContain('rep_id UUID UNIQUE NOT NULL REFERENCES reps(id) ON DELETE CASCADE')
    expect(table).toContain('stripe_subscription_id TEXT UNIQUE')
  })

  it('does not drop the subscriptions.rep_id unique constraint in later migrations', () => {
    const files = readdirSync(migrationsDir).filter((name) => name.endsWith('.sql'))
    const dropPatterns = [
      /DROP CONSTRAINT(?:\s+IF EXISTS)?\s+(?:["']?public["']?\.)?["']?subscriptions_rep_id_key/i,
      /ALTER TABLE(?:\s+IF EXISTS)?(?:\s+ONLY)?(?:\s+(?:public|["']public["'])\.)?subscriptions[\s\S]{0,800}DROP CONSTRAINT[^;]*rep_id/i,
      /DROP INDEX(?:\s+IF EXISTS)?(?:\s+CONCURRENTLY)?\s+(?:["']?public["']?\.)?["']?(?:idx_)?subscriptions_rep_id/i,
    ]

    for (const name of files) {
      if (name === '006_sparkle_suite_schema.sql') continue
      const sql = readFileSync(path.join(migrationsDir, name), 'utf8')
      for (const pattern of dropPatterns) {
        expect(sql, `${name} must not drop subscriptions.rep_id uniqueness`).not.toMatch(
          pattern,
        )
      }
    }
  })
})
