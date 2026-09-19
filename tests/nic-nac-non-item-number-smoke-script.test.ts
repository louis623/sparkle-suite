import { describe, expect, it, vi } from 'vitest'
import packageJson from '@/package.json'
import {
  findForbiddenPublicSourceLanguage,
  finderAvailabilityExcludesListing,
  publicTradeBoardPayloadHasListing,
  requireNonItemNumberSmokeAsset,
  runNonItemNumberTradeBoardSmoke,
} from '@/scripts/smoke-nic-nac-trade-board-non-item-number'

describe('Nic-Nac non-item-number Dance Floor smoke script', () => {
  it('is registered as an explicit smoke command', () => {
    expect(packageJson.scripts['smoke:nic-nac:trade-board-non-item-number']).toBe(
      'tsx --conditions=react-server scripts/smoke-nic-nac-trade-board-non-item-number.ts',
    )
  })

  it('reports a missing individual jewelry photo before live calls', () => {
    const result = requireNonItemNumberSmokeAsset(
      {
        SPARKLE_NIC_NAC_NON_ITEM_SMOKE_PHOTO: 'C:/missing/non-item-ring.jpg',
      },
      { existsSync: () => false },
    )

    expect(result).toEqual({
      ok: false,
      fixturePath: 'C:/missing/non-item-ring.jpg',
      missing: ['C:/missing/non-item-ring.jpg'],
    })
  })

  it('short-circuits before requiring env when the fixture is missing', async () => {
    const result = await runNonItemNumberTradeBoardSmoke({
      SPARKLE_NIC_NAC_NON_ITEM_SMOKE_PHOTO: 'C:/missing/non-item-ring.jpg',
    })

    expect(result.ok).toBe(false)
    expect(result.status).toBe('missing_assets')
    expect(result.missing).toEqual(['C:/missing/non-item-ring.jpg'])
  })

  it('flags customer-facing source wording that should never leak', () => {
    expect(
      findForbiddenPublicSourceLanguage(
        'This non-item number piece should not look like a legacy grab bag.',
      ),
    ).toEqual(['legacy', 'grab bag', 'non-item number'])
  })

  it('treats Finder catalog filter rows as excluded when listing_source is not catalog', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              not: vi.fn(() => ({ maybeSingle })),
            })),
          })),
        })),
      })),
    }

    await expect(
      finderAvailabilityExcludesListing(supabase as never, 'listing-uncataloged'),
    ).resolves.toBe(true)
    expect(supabase.from).toHaveBeenCalledWith('trade_listings')
  })

  it('requires the created listing to appear in the public payload', () => {
    expect(
      publicTradeBoardPayloadHasListing(
        { listings: [{ id: 'listing-1' }, { id: 'listing-2' }] },
        'listing-2',
      ),
    ).toBe(true)
    expect(
      publicTradeBoardPayloadHasListing({ listings: [] }, 'listing-2'),
    ).toBe(false)
    expect(publicTradeBoardPayloadHasListing({}, 'listing-2')).toBe(false)
  })
})
