import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

import {
  AMETHYST_SKIN_CARDS,
  getAmethystSkinCardsForIds,
} from '@/lib/amethyst/skin-cards'
import {
  getAvailableAmethystSkinCardsForRep,
  isAmethystSkinSelectionAvailableToRep,
} from '@/lib/amethyst/skin-access'

const read = (...parts: string[]) => readFileSync(resolve(process.cwd(), ...parts), 'utf8')

describe('Amethyst skin visibility policy', () => {
  it('marks the four issued custom skins private and seasonal Halloween community', () => {
    expect(
      AMETHYST_SKIN_CARDS
        .filter(({ visibility }) => visibility === 'private')
        .map(({ id }) => id),
    ).toEqual([
      'black_diamond',
      'alpine_opal',
      'gnome_garden',
      'neon_butterfly',
    ])
    expect(
      AMETHYST_SKIN_CARDS.find(({ id }) => id === 'halloween_pumpkin_witch'),
    ).toMatchObject({ visibility: 'community' })
  })

  it('renders only the IDs the database made available to the account', () => {
    const cards = getAmethystSkinCardsForIds([
      'amethyst',
      'halloween_pumpkin_witch',
      'black_diamond',
    ])

    expect(cards.map(({ id }) => id)).toEqual([
      'amethyst',
      'black_diamond',
      'halloween_pumpkin_witch',
    ])
    expect(cards.map(({ id }) => id)).not.toContain('alpine_opal')
    expect(cards.map(({ id }) => id)).not.toContain('gnome_garden')
    expect(cards.map(({ id }) => id)).not.toContain('neon_butterfly')
  })

  it('uses the same RPC policy for card lists and individual selections', async () => {
    const rpc = vi.fn(async (name: string, args: Record<string, string>) => {
      if (name === 'list_available_amethyst_skin_ids') {
        return {
          data: [{ skin_id: 'amethyst' }, { skin_id: 'neon_butterfly' }],
          error: null,
        }
      }

      return {
        data: args.p_skin_id === 'neon_butterfly',
        error: null,
      }
    })
    const client = { rpc } as never

    await expect(
      getAvailableAmethystSkinCardsForRep(client, 'kelly-rep-id'),
    ).resolves.toMatchObject([{ id: 'amethyst' }, { id: 'neon_butterfly' }])
    await expect(
      isAmethystSkinSelectionAvailableToRep(client, 'NB-01', 'kelly-rep-id'),
    ).resolves.toBe(true)
    await expect(
      isAmethystSkinSelectionAvailableToRep(client, 'HPW-01', 'kelly-rep-id'),
    ).resolves.toBe(false)

    expect(rpc).toHaveBeenCalledWith('list_available_amethyst_skin_ids', {
      p_rep_id: 'kelly-rep-id',
    })
    expect(rpc).toHaveBeenCalledWith('amethyst_skin_is_available_to_rep', {
      p_rep_id: 'kelly-rep-id',
      p_skin_id: 'neon_butterfly',
    })
  })

  it('keeps the final authorization decision in the database without rewriting existing selections', () => {
    const migration = read(
      'supabase',
      'migrations',
      '20260922000100_enforce_amethyst_skin_visibility.sql',
    )

    for (const id of [
      'black_diamond',
      'alpine_opal',
      'gnome_garden',
      'neon_butterfly',
    ]) {
      expect(migration).toContain("'" + id + "'")
    }
    expect(migration).toContain("'halloween_pumpkin_witch', 'community'")
    expect(migration).toContain("account_classification = 'demo'")
    expect(migration).toContain("Private skin assignment conflict")
    expect(migration).toContain("site_settings_amethyst_skin_visibility")
    expect(migration).toContain("amethyst_skin_is_available_to_rep")
    expect(migration).toContain("list_available_amethyst_skin_ids")
  })

  it('uses the scoped catalog in all picker surfaces and all known write paths', () => {
    expect(read('app', 'nic-nac', 'components', 'RequiredSetupLookPicker.tsx')).toContain(
      'useAvailableAmethystSkinCards',
    )
    expect(read('app', 'nic-nac', 'components', 'DashboardPlaceholder.tsx')).toContain(
      'useAvailableAmethystSkinCards',
    )
    for (const file of [
      ['lib', 'services', 'site-settings.ts'],
      ['lib', 'nic-nac', 'tools', 'update-site-setting.ts'],
      ['lib', 'self-serve', 'required-setup-site-draft.ts'],
    ]) {
      expect(read(...file)).toContain(
        "from '@/lib/amethyst/skin-access'",
      )
    }
  })
})
