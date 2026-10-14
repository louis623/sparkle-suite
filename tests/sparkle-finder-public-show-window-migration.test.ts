import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  join(
    process.cwd(),
    'supabase',
    'migrations',
    '20261014133000_ss_finder_public_show_window.sql',
  ),
  'utf8',
).toLowerCase()

describe('Sparkle Finder public show window migration', () => {
  it('keeps scheduled directory shows until start plus duration, defaulting to 60 minutes', () => {
    const scheduledWindow = migration.slice(
      migration.indexOf("event.status = 'scheduled'"),
      migration.indexOf("event.status = 'live'"),
    )

    expect(scheduledWindow).toContain('event.event_time')
    expect(scheduledWindow).toContain('make_interval')
    expect(scheduledWindow).toContain('else 60')
    expect(scheduledWindow).toContain('> p_as_of')
    expect(scheduledWindow).not.toContain('event.event_time >= p_as_of')
    expect(migration).not.toMatch(/status = 'cancelled'/)
  })

  it('replaces only the Finder directory read and leaves live-status filtering in place', () => {
    expect(migration).toContain(
      'create or replace function public.list_sparkle_finder_public_reps',
    )
    expect(migration).toContain("event.status = 'live'")
    expect(migration).toContain('event.event_time <= p_as_of')
    expect(migration).toContain('to service_role')
    expect(migration).toContain('from public, anon, authenticated')
    expect(migration).not.toContain('drop function')
    expect(migration).not.toContain('alter table')
    expect(migration).not.toContain('live_lineup')
    expect(migration).not.toContain('insert into')
    expect(migration).not.toContain('delete from')
    expect(migration).not.toContain('update public.')
  })
})
