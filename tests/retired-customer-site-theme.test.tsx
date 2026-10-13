import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { getAmethystSkinCardsForIds } from '@/lib/amethyst/skin-cards'
import { SiteSettingsCard } from '@/app/nic-nac/components/DashboardPlaceholder'
import { RequiredSetupLookPicker } from '@/app/nic-nac/components/RequiredSetupLookPicker'

vi.mock('@/app/nic-nac/components/useAvailableAmethystSkinCards', () => ({
  useAvailableAmethystSkinCards: () => ({
    status: 'ready',
    cards: getAmethystSkinCardsForIds(['amethyst', 'rose_quartz', 'rose_gold']),
  }),
}))

describe('retired customer-site theme controls', () => {
  it('does not offer Rose Quartz in the loaded setup picker', () => {
    const html = renderToStaticMarkup(createElement(RequiredSetupLookPicker, {
      repId: 'synthetic-rep', onChoose: vi.fn(),
    }))
    expect(html).toContain('Rose Gold')
    expect(html).not.toContain('Rose Quartz')
    expect(html).not.toContain('RQ-01')
  })

  it('omits Rose Quartz entirely from the loaded Site Settings options', () => {
      const settings = {
        displayName: 'Synthetic Rep', businessName: 'Synthetic Shop',
        email: 'test@example.test', phone: '', bannerText: '', bannerVisible: false,
        tickerText: '', tickerVisible: false, tagline: '', heroImageUrl: '',
        heroAnimationType: 'still' as const, teamName: '', showJoinPage: true,
        customerSiteTemplate: 'amethyst' as const, appearancePreset: 'amethyst' as const, socialHandles: {},
      }
      const html = renderToStaticMarkup(createElement(SiteSettingsCard, {
        repId: 'synthetic-rep', state: { status: 'ready', settings }, draft: settings,
      }))
      expect(html).not.toContain('Rose Quartz')
      expect(html).not.toContain('RQ-01')
      expect(html).toContain('Rose Gold')
      expect(html).not.toContain('value="rose_quartz"')
      expect(html).not.toContain('no longer offered')
  })
})
