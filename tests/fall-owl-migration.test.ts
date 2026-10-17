import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { describe, expect, it } from 'vitest'

const migration = readFileSync('supabase/migrations/20261017000100_add_fall_owl_harvest_moon.sql', 'utf8')
const baseline = readFileSync('supabase/migrations/20261004000300_add_rose_champagne.sql', 'utf8')
const previousCheck = baseline.match(/CHECK\s*\([\s\S]*?\n  \);/)![0].replace(/;$/, '')
const legacyIds = [...previousCheck.matchAll(/'([a-z_]+)'/g)].map(match => match[1])

async function database() {
  const db = new PGlite()
  await db.exec(`CREATE TABLE public.site_settings (
    rep_id text PRIMARY KEY, appearance_preset text NOT NULL,
    CONSTRAINT site_settings_appearance_preset_check ${previousCheck}
  );
  CREATE TABLE public.amethyst_skin_catalog (
    skin_id text PRIMARY KEY, visibility text NOT NULL,
    owner_rep_id uuid, allow_internal_demo boolean NOT NULL DEFAULT false
  );`)
  for (const id of legacyIds) await db.query('INSERT INTO public.site_settings VALUES ($1,$2)', ['rep-'+id, id])
  return db
}

describe('Fall Owl and Harvest Moon migration preserves deployed selections and policy', () => {
  it('retains all 22 legacy selections, adds one Community row, and can be reapplied', async () => {
    const db = await database()
    try {
      await db.exec(migration)
      await db.exec(migration)
      const selections = await db.query<{ appearance_preset: string }>('SELECT appearance_preset FROM public.site_settings ORDER BY appearance_preset')
      expect(selections.rows.map(row => row.appearance_preset)).toEqual([...legacyIds].sort())
      expect(legacyIds).toHaveLength(22)
      const catalog = await db.query('SELECT * FROM public.amethyst_skin_catalog')
      expect(catalog.rows).toEqual([{ skin_id: 'fall_owl_harvest_moon', visibility: 'community', owner_rep_id: null, allow_internal_demo: false }])
      await expect(db.query('INSERT INTO public.site_settings VALUES ($1,$2)', ['new-rep', 'fall_owl_harvest_moon'])).resolves.toBeDefined()
      await expect(db.query('INSERT INTO public.site_settings VALUES ($1,$2)', ['invalid-rep', 'unsupported_theme'])).rejects.toThrow(/appearance_preset_check/)
    } finally { await db.close() }
  }, 15_000)

  it.each([
    ['private', null, false],
    ['community', '00000000-0000-0000-0000-000000000001', false],
    ['community', null, true],
  ])('rejects an existing conflicting catalog policy (%s, %s, %s) without weakening the constraint', async (visibility, owner, internalDemo) => {
    const db = await database()
    try {
      await db.query('INSERT INTO public.amethyst_skin_catalog VALUES ($1,$2,$3,$4)', ['fall_owl_harvest_moon', visibility, owner, internalDemo])
      await expect(db.exec(migration)).rejects.toThrow('already has a different catalog policy')
      await db.exec('ROLLBACK')
      const catalog = await db.query('SELECT visibility, owner_rep_id, allow_internal_demo FROM public.amethyst_skin_catalog')
      expect(catalog.rows).toEqual([{ visibility, owner_rep_id: owner, allow_internal_demo: internalDemo }])
      await expect(db.query('INSERT INTO public.site_settings VALUES ($1,$2)', ['new-rep', 'fall_owl_harvest_moon'])).rejects.toThrow(/appearance_preset_check/)
    } finally { await db.close() }
  }, 15_000)
})
