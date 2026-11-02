import { beforeEach, expect, it, vi } from 'vitest'
import { defaultAmethystHomepageTemplateData as homepage } from '@/lib/amethyst/homepage-template-data'
import { defaultAmethystJoinTemplateData as join } from '@/lib/amethyst/join-template-data'
import { defaultAmethystTradeTemplateData as trade } from '@/lib/amethyst/trade-template-data'

const mocks = vi.hoisted(() => ({ discount: vi.fn() }))
vi.mock('@/lib/public-site/signup-discount-settings', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/public-site/signup-discount-settings')>(),
  loadSavedSignupDiscount: mocks.discount,
}))
vi.mock('@/lib/amethyst/homepage-upcoming-shows', () => ({ loadAmethystHomepageUpcomingShows: async () => [] }))
vi.mock('@/lib/amethyst/trade-board-listings', () => ({ loadAmethystTradeBoardPreviewListings: async () => [] }))
import { buildHomepageBootstrapResponse } from '@/lib/amethyst/homepage-bootstrap-response'

beforeEach(() => mocks.discount.mockReset())

it('includes the resolved rep discount in the initial v2 bootstrap', async () => {
  mocks.discount.mockResolvedValue({ code: 'MILEHIGHFIZZCUSTOMER', offer: 'Your 15% off code' })
  const response = await buildHomepageBootstrapResponse(new Request('https://example.test/milehighfizz?publicSiteSlug=milehighfizz'), {
    templateData: Promise.resolve({ homepage, join, trade, appearancePreset: 'amethyst' }),
    repId: 'resolved-lindsey-id',
  })
  const script = await response.text()
  expect(mocks.discount).toHaveBeenCalledExactlyOnceWith('resolved-lindsey-id')
  expect(script).toContain('"signupDiscountCode":"MILEHIGHFIZZCUSTOMER"')
  expect(script).toContain('"signupDiscountOffer":"Your 15% off code"')
})

it('does not carry Lindsey’s discount into another rep request', async () => {
  mocks.discount.mockResolvedValue(null)
  const response = await buildHomepageBootstrapResponse(new Request('https://example.test/other-rep'), {
    templateData: Promise.resolve({ homepage, join, trade, appearancePreset: 'amethyst' }),
    repId: 'resolved-other-id',
  })
  expect(mocks.discount).toHaveBeenCalledExactlyOnceWith('resolved-other-id')
  const script = await response.text()
  expect(script).not.toContain('signupDiscountCode')
  expect(script).not.toContain('MILEHIGHFIZZCUSTOMER')
})
