import { describe, expect, it, vi } from 'vitest'
import { updateSiteSettingsDashboard } from '@/lib/services/site-settings'
import { normalizeSocialVisibility } from '@/lib/public-site/social-visibility'
import { buildPublicSiteVisibilityCss, resolvePublicSiteVisibility } from '@/lib/public-site/visibility'

describe('social publication preferences', () => {
  it('defaults existing and future accounts to visible and keeps explicit Off choices', () => {
    expect(normalizeSocialVisibility(null)).toEqual({})
    expect(buildPublicSiteVisibilityCss({ social: {} })).toBe('')
    expect(normalizeSocialVisibility({ tiktok: false, whatnot: true, youtube: 'false', unknown: false })).toEqual({ tiktok: false, whatnot: true })
  })

  it('passes independent preferences through the shared customer page presentation contract', () => {
    const settings = { tickerVisible: true, showJoinPage: false, socialVisibility: { tiktok: false, whatnot: true } }
    const css = buildPublicSiteVisibilityCss(resolvePublicSiteVisibility(settings))
    expect(css).toContain('https://www.tiktok.com/')
    expect(css).not.toContain('whatnot.com')
    expect(settings.socialVisibility).toEqual({ tiktok: false, whatnot: true })
  })

  it.each([null, [], { tiktok: 'false' }, { unknown: false }])('rejects invalid settings before writes: %j', async socialVisibility => {
    const from = vi.fn()
    await expect(updateSiteSettingsDashboard({ from } as never, 'rep-test', { socialVisibility } as never)).rejects.toThrow()
    expect(from).not.toHaveBeenCalled()
  })

  it('saves Off and On without changing the saved social URLs', async () => {
    const rep = { display_name: 'Test', business_name: 'Test', email: 'synthetic@example.invalid', social_handles: { tiktok: '@synthetic' } }
    for (const visible of [false, true]) {
      const row = { social_visibility: { tiktok: visible } }
      const upsert = vi.fn(() => ({ select: () => ({ single: async () => ({ data: row, error: null }) }) }))
      const from = vi.fn((table: string) => {
        if (table === 'site_settings') return { upsert }
        if (table === 'reps') return { select: () => ({ eq: () => ({ single: async () => ({ data: rep, error: null }) }) }) }
        throw new Error(`Unexpected table: ${table}`)
      })
      const result = await updateSiteSettingsDashboard({ from } as never, 'rep-test', { socialVisibility: { tiktok: visible } })
      expect(upsert).toHaveBeenCalledWith({ rep_id: 'rep-test', social_visibility: { tiktok: visible } }, { onConflict: 'rep_id' })
      expect(result.socialVisibility).toEqual({ tiktok: visible })
      expect(result.socialHandles).toEqual({ tiktok: '@synthetic' })
    }
  })
})
