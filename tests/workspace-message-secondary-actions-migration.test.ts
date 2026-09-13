import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = fs.readFileSync(
  path.join(
    process.cwd(),
    'supabase/migrations/20260913000200_workspace_message_secondary_actions.sql',
  ),
  'utf8',
)

describe('workspace Message Center secondary action migration', () => {
  it('adds an optional paired secondary action without broadening rep access', () => {
    expect(migration).toContain('secondary_action_label TEXT')
    expect(migration).toContain('secondary_action_url TEXT')
    expect(migration).toContain('workspace_message_publications_secondary_action_pair')
    expect(migration).toContain('GRANT SELECT (secondary_action_label, secondary_action_url)')
    expect(migration).toContain('TO authenticated')
  })
})
