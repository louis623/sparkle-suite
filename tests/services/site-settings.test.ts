import { describe, expect, it, vi } from 'vitest'

import {
  getSiteSettingsDashboard,
  normalizePublicSiteMediaSlots,
  updateSiteSettingsDashboard,
} from '@/lib/services/site-settings'

function makeSelectSingle(response: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(response)
  const maybeSingle = vi.fn().mockResolvedValue(response)
  const eq = vi.fn(() => ({ single, maybeSingle }))
  const select = vi.fn(() => ({ eq }))

  return {
    api: { select },
    spies: { select, eq, single, maybeSingle },
  }
}

function makeUpsertSingle(response: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(response)
  const select = vi.fn(() => ({ single }))
  const upsert = vi.fn(() => ({ select }))

  return {
    api: { upsert },
    spies: { upsert, select, single },
  }
}

function makeUpdateSingle(response: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(response)
  const select = vi.fn(() => ({ single }))
  const eq = vi.fn(() => ({ select }))
  const update = vi.fn(() => ({ eq }))

  return {
    api: { update },
    spies: { update, eq, select, single },
  }
}

describe('site settings service', () => {
  it('accepts TikTok embed markup and stores the canonical video URL', () => {
    expect(
      normalizePublicSiteMediaSlots(
        [
          {
            key: 'about_2',
            caption: 'Live reveal',
            imageUrl: '',
            videoUrl:
              '<blockquote class="tiktok-embed" cite="https://www.tiktok.com/@sparkle/video/7412345678901234567" data-video-id="7412345678901234567"></blockquote>',
          },
        ],
        { rejectInvalidUrls: true },
      ),
    ).toEqual([
      { key: 'showcase', caption: '', imageUrl: '', videoUrl: '' },
      {
        key: 'about_1',
        caption: '',
        imageUrl: '',
        videoUrl: '',
      },
      {
        key: 'about_2',
        caption: '',
        imageUrl: '',
        videoUrl:
          'https://www.tiktok.com/@sparkle/video/7412345678901234567',
      },
      { key: 'about_3', caption: '', imageUrl: '', videoUrl: '' },
      { key: 'about_4', caption: '', imageUrl: '', videoUrl: '' },
    ])
  })

  it('retains public Instagram and Facebook video links for their allowlisted players', () => {
    expect(
      normalizePublicSiteMediaSlots(
        [
          {
            key: 'about_2',
            videoUrl: 'https://www.instagram.com/reel/C7Example_9/',
          },
          {
            key: 'about_3',
            videoUrl: 'https://www.facebook.com/example/videos/123456789012345/',
          },
        ],
        { rejectInvalidUrls: true },
      ),
    ).toMatchObject([
      { key: 'showcase', videoUrl: '' },
      { key: 'about_1', videoUrl: '' },
      { key: 'about_2', videoUrl: 'https://www.instagram.com/reel/C7Example_9/' },
      {
        key: 'about_3',
        videoUrl: 'https://www.facebook.com/example/videos/123456789012345/',
      },
      { key: 'about_4', videoUrl: '' },
    ])
  })

  it('rejects invalid media text instead of silently reporting it as saved', () => {
    expect(() =>
      normalizePublicSiteMediaSlots(
        [
          {
            key: 'about_2',
            caption: 'Broken clip',
            imageUrl: '',
            videoUrl: 'not a URL or embed',
          },
        ],
        { rejectInvalidUrls: true },
      ),
    ).toThrow('about_2 video URL or embed code is invalid')
  })

  it('rejects video hosts that do not have a supported customer-site player', () => {
    expect(() =>
      normalizePublicSiteMediaSlots(
        [{ key: 'about_2', videoUrl: 'https://example.com/short-video' }],
        { rejectInvalidUrls: true },
      ),
    ).toThrow('about_2 video URL or embed code is invalid')
  })

  it('rejects TikTok photo posts because the customer-site player needs a video id', () => {
    expect(() =>
      normalizePublicSiteMediaSlots(
        [
          {
            key: 'showcase',
            videoUrl: 'https://www.tiktok.com/@brittwithbling/photo/7680907837425388814',
          },
        ],
        { rejectInvalidUrls: true },
      ),
    ).toThrow('showcase video URL or embed code is invalid')
  })

  it('preserves explicit media removal and Brittany section visibility state', () => {
    expect(
      normalizePublicSiteMediaSlots([
        {
          key: 'showcase',
          videoUrl: '',
          isVisible: false,
        },
        {
          key: 'about_1',
          imageUrl: 'https://www.yoursparklesuite.com/britt-with-bling/hero.jpeg',
          isVisible: true,
          sectionVisible: true,
        },
      ]),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'showcase', videoUrl: '', isVisible: false }),
        expect.objectContaining({
          key: 'about_1',
          imageUrl: 'https://www.yoursparklesuite.com/britt-with-bling/hero.jpeg',
          isVisible: true,
          sectionVisible: true,
        }),
      ]),
    )
  })

  it('returns rep profile data with safe defaults when site settings row is missing', async () => {
    const siteSettingsChain = makeSelectSingle({ data: null, error: null })
    const repsChain = makeSelectSingle({
      data: {
        display_name: 'Louis',
        business_name: 'Sparkle by Sasha',
        email: 'louis@example.com',
        phone: '+19045551234',
        shop_link: null,
        social_handles: {
          instagram: '@sparklebysasha',
        },
      },
      error: null,
    })

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'site_settings') return siteSettingsChain.api
        if (table === 'reps') return repsChain.api
        throw new Error(`Unexpected table ${table}`)
      }),
    }

    const result = await getSiteSettingsDashboard(supabase as never, 'rep-1')

    expect(result).toEqual({
      displayName: 'Louis',
      businessName: 'Sparkle by Sasha',
      email: 'louis@example.com',
      phone: '+19045551234',
      shopLink: '',
      bannerText: '',
      bannerVisible: false,
      tickerText: '',
      tickerVisible: false,
      tagline: '',
      heroHeadline: '',
      heroSubtitle: '',
      heroImageUrl: '',
      heroAnimationType: 'sparkle_rise',
      teamName: '',
      memberTeamName: '',
      joinTeamAccessEnabled: false,
      showJoinPage: true,
      customerSiteTemplate: 'amethyst',
      appearancePreset: 'sparkle_suite_morganite',
      aboutHeading: '',
      aboutSubheading: '',
      socialHandles: {
        instagram: '@sparklebysasha',
      },
      aboutNarrative: '',
      homepageMediaSlots: [
        { key: 'showcase', caption: '', imageUrl: '', videoUrl: '' },
        { key: 'about_1', caption: '', imageUrl: '', videoUrl: '' },
        { key: 'about_2', caption: '', imageUrl: '', videoUrl: '' },
        { key: 'about_3', caption: '', imageUrl: '', videoUrl: '' },
        { key: 'about_4', caption: '', imageUrl: '', videoUrl: '' },
      ],
    })
  })

  it('upserts site settings, updates rep profile fields, and trims empty social handles', async () => {
    const siteSettingsChain = makeUpsertSingle({
      data: {
        banner_text: 'Going live tonight',
        banner_visible: true,
        ticker_text: 'Fresh reveals every Tuesday',
        ticker_visible: true,
        tagline: 'Live sparkle, zero stress.',
        hero_headline: 'A little wonder, a lot of sparkle.',
        hero_subtitle: 'Settle in for live reveals and friendly faces.',
        hero_image_url: 'https://cdn.example.com/hero.jpg',
        hero_animation_type: 'soft_glow',
        team_name: 'Moonstone Squad',
        show_join_page: false,
        customer_site_template: 'amethyst',
        appearance_preset: 'rose_gold',
        about_narrative: 'A little about our reveal community.',
        homepage_media_slots: [
          {
            key: 'showcase',
            caption: '',
            imageUrl: '',
            videoUrl: 'https://www.tiktok.com/@sparkle/video/1',
          },
        ],
      },
      error: null,
    })
    const repsChain = makeUpdateSingle({
      data: {
        display_name: 'Louis',
        business_name: 'Sparkle by Sasha',
        email: 'hello@sparklebysasha.com',
        phone: '+19045551234',
        shop_link: 'https://bombparty.com/shop/sparkle-by-sasha',
        social_handles: {
          instagram: '@sparklebysasha',
          facebook: 'sparklebysasha',
        },
      },
      error: null,
    })

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'site_settings') return siteSettingsChain.api
        if (table === 'reps') return repsChain.api
        throw new Error(`Unexpected table ${table}`)
      }),
    }

    const result = await updateSiteSettingsDashboard(supabase as never, 'rep-1', {
      displayName: 'Louis',
      businessName: 'Sparkle by Sasha',
      email: 'hello@sparklebysasha.com',
      phone: '+19045551234',
      shopLink: 'https://bombparty.com/shop/sparkle-by-sasha',
      bannerText: 'Going live tonight',
      bannerVisible: true,
      tickerText: 'Fresh reveals every Tuesday',
      tickerVisible: true,
      tagline: 'Live sparkle, zero stress.',
      heroHeadline: 'A little wonder, a lot of sparkle.',
      heroSubtitle: 'Settle in for live reveals and friendly faces.',
      heroImageUrl: 'https://cdn.example.com/hero.jpg',
      heroAnimationType: 'soft_glow',
      teamName: 'Moonstone Squad',
      showJoinPage: false,
      customerSiteTemplate: 'not-a-real-template',
      appearancePreset: 'rose_gold',
      aboutNarrative: 'A little about our reveal community.',
      socialHandles: {
        instagram: '@sparklebysasha',
        facebook: 'sparklebysasha',
        tiktok: '   ',
      },
      homepageMediaSlots: [
        {
          key: 'showcase',
          caption: ' Favorite reveal ',
          imageUrl: 'https://cdn.example.com/showcase.jpg',
          videoUrl: 'https://www.tiktok.com/@sparkle/video/1',
        },
      ],
    })

    expect(siteSettingsChain.spies.upsert).toHaveBeenCalledWith(
      {
        rep_id: 'rep-1',
        banner_text: 'Going live tonight',
        banner_visible: true,
        ticker_text: 'Fresh reveals every Tuesday',
        ticker_visible: true,
        tagline: 'Live sparkle, zero stress.',
        hero_headline: 'A little wonder, a lot of sparkle.',
        hero_subtitle: 'Settle in for live reveals and friendly faces.',
        hero_image_url: 'https://cdn.example.com/hero.jpg',
        hero_animation_type: 'soft_glow',
        team_name: 'Moonstone Squad',
        show_join_page: false,
        customer_site_template: 'amethyst',
        appearance_preset: 'rose_gold',
        about_narrative: 'A little about our reveal community.',
        homepage_media_slots: [
          {
            key: 'showcase',
            caption: '',
            imageUrl: '',
            videoUrl: 'https://www.tiktok.com/@sparkle/video/1',
          },
          { key: 'about_1', caption: '', imageUrl: '', videoUrl: '' },
          { key: 'about_2', caption: '', imageUrl: '', videoUrl: '' },
          { key: 'about_3', caption: '', imageUrl: '', videoUrl: '' },
          { key: 'about_4', caption: '', imageUrl: '', videoUrl: '' },
        ],
      },
      { onConflict: 'rep_id' },
    )
    expect(repsChain.spies.update).toHaveBeenCalledWith({
      display_name: 'Louis',
      business_name: 'Sparkle by Sasha',
      email: 'hello@sparklebysasha.com',
      phone: '+19045551234',
      shop_link: 'https://bombparty.com/shop/sparkle-by-sasha',
      social_handles: {
        instagram: '@sparklebysasha',
        facebook: 'sparklebysasha',
      },
    })
    expect(result.socialHandles).toEqual({
      instagram: '@sparklebysasha',
      facebook: 'sparklebysasha',
    })
    expect(result.showJoinPage).toBe(false)
    expect(result.heroAnimationType).toBe('soft_glow')
    expect(result.customerSiteTemplate).toBe('amethyst')
    expect(result.appearancePreset).toBe('rose_gold')
    expect(result.shopLink).toBe('https://bombparty.com/shop/sparkle-by-sasha')
  })

  it('rejects unsafe Bomb Party store links before writing the rep profile', async () => {
    const supabase = { from: vi.fn() }

    await expect(
      updateSiteSettingsDashboard(supabase as never, 'rep-1', {
        shopLink: 'javascript:alert(1)',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' })

    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('lets Nic-Nac save only the customer-site appearance preset', async () => {
    const siteSettingsChain = makeUpsertSingle({
      data: {
        banner_text: null,
        banner_visible: false,
        ticker_text: null,
        ticker_visible: false,
        tagline: null,
        hero_image_url: null,
        hero_animation_type: 'sparkle_rise',
        team_name: null,
        show_join_page: true,
        customer_site_template: 'amethyst',
        appearance_preset: 'sparkle_suite_morganite',
      },
      error: null,
    })
    const repsChain = makeSelectSingle({
      data: {
        display_name: 'Jane',
        business_name: "Jane's Sparkle Party",
        email: 'jane@example.com',
        phone: null,
        social_handles: null,
      },
      error: null,
    })

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'site_settings') return siteSettingsChain.api
        if (table === 'reps') return repsChain.api
        throw new Error(`Unexpected table ${table}`)
      }),
    }

    const result = await updateSiteSettingsDashboard(supabase as never, 'rep-1', {
      appearancePreset: 'sparkle_suite_morganite',
    })

    expect(siteSettingsChain.spies.upsert).toHaveBeenCalledWith(
      {
        rep_id: 'rep-1',
        appearance_preset: 'sparkle_suite_morganite',
      },
      { onConflict: 'rep_id' },
    )
    expect(repsChain.spies.select).toHaveBeenCalled()
    expect(result).toMatchObject({
      displayName: 'Jane',
      businessName: "Jane's Sparkle Party",
      customerSiteTemplate: 'amethyst',
      appearancePreset: 'sparkle_suite_morganite',
    })
  })

  it('normalizes legacy placeholder appearance presets to the Morganite default', async () => {
    const siteSettingsChain = makeUpsertSingle({
      data: {
        banner_text: null,
        banner_visible: false,
        ticker_text: null,
        ticker_visible: false,
        tagline: null,
        hero_image_url: null,
        hero_animation_type: 'sparkle_rise',
        team_name: null,
        show_join_page: true,
        customer_site_template: 'amethyst',
        appearance_preset: 'sparkle_suite_morganite',
      },
      error: null,
    })
    const repsChain = makeSelectSingle({
      data: {
        display_name: 'Jane',
        business_name: "Jane's Sparkle Party",
        email: 'jane@example.com',
        phone: null,
        social_handles: null,
      },
      error: null,
    })

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'site_settings') return siteSettingsChain.api
        if (table === 'reps') return repsChain.api
        throw new Error(`Unexpected table ${table}`)
      }),
    }

    const result = await updateSiteSettingsDashboard(supabase as never, 'rep-1', {
      appearancePreset: 'softGlam',
    })

    expect(siteSettingsChain.spies.upsert).toHaveBeenCalledWith(
      {
        rep_id: 'rep-1',
        appearance_preset: 'sparkle_suite_morganite',
      },
      { onConflict: 'rep_id' },
    )
    expect(result.appearancePreset).toBe('sparkle_suite_morganite')
  })

  it('saves the Sparkle Suite/Morganite skin while keeping the customer-site template Amethyst', async () => {
    const siteSettingsChain = makeUpsertSingle({
      data: {
        banner_text: null,
        banner_visible: false,
        ticker_text: null,
        ticker_visible: false,
        tagline: null,
        hero_image_url: null,
        hero_animation_type: 'sparkle_rise',
        team_name: null,
        show_join_page: true,
        customer_site_template: 'amethyst',
        appearance_preset: 'sparkle_suite_morganite',
      },
      error: null,
    })
    const repsChain = makeSelectSingle({
      data: {
        display_name: 'Jane',
        business_name: "Jane's Sparkle Party",
        email: 'jane@example.com',
        phone: null,
        social_handles: null,
      },
      error: null,
    })

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'site_settings') return siteSettingsChain.api
        if (table === 'reps') return repsChain.api
        throw new Error(`Unexpected table ${table}`)
      }),
    }

    const result = await updateSiteSettingsDashboard(supabase as never, 'rep-1', {
      customerSiteTemplate: 'some-other-template',
      appearancePreset: 'sparkle_suite_morganite',
    })

    expect(siteSettingsChain.spies.upsert).toHaveBeenCalledWith(
      {
        rep_id: 'rep-1',
        customer_site_template: 'amethyst',
        appearance_preset: 'sparkle_suite_morganite',
      },
      { onConflict: 'rep_id' },
    )
    expect(result.customerSiteTemplate).toBe('amethyst')
    expect(result.appearancePreset).toBe('sparkle_suite_morganite')
  })

  it('saves Black Diamond when the customer-facing site skin is submitted', async () => {
    const siteSettingsChain = makeUpsertSingle({
      data: {
        banner_text: null,
        banner_visible: false,
        ticker_text: null,
        ticker_visible: false,
        tagline: null,
        hero_image_url: null,
        hero_animation_type: 'sparkle_rise',
        team_name: null,
        show_join_page: true,
        customer_site_template: 'amethyst',
        appearance_preset: 'black_diamond',
      },
      error: null,
    })
    const repsChain = makeSelectSingle({
      data: {
        display_name: 'Jane',
        business_name: "Jane's Sparkle Party",
        email: 'jane@example.com',
        phone: null,
        social_handles: null,
      },
      error: null,
    })

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'site_settings') return siteSettingsChain.api
        if (table === 'reps') return repsChain.api
        throw new Error(`Unexpected table ${table}`)
      }),
    }

    const result = await updateSiteSettingsDashboard(supabase as never, 'rep-1', {
      customerSiteTemplate: 'some-other-template',
      appearancePreset: 'black_diamond',
    })

    expect(siteSettingsChain.spies.upsert).toHaveBeenCalledWith(
      {
        rep_id: 'rep-1',
        customer_site_template: 'amethyst',
        appearance_preset: 'black_diamond',
      },
      { onConflict: 'rep_id' },
    )
    expect(result.customerSiteTemplate).toBe('amethyst')
    expect(result.appearancePreset).toBe('black_diamond')
  })

  it('saves Rose Gold when the customer-facing site skin is submitted', async () => {
    const siteSettingsChain = makeUpsertSingle({
      data: {
        banner_text: null,
        banner_visible: false,
        ticker_text: null,
        ticker_visible: false,
        tagline: null,
        hero_image_url: null,
        hero_animation_type: 'sparkle_rise',
        team_name: null,
        show_join_page: true,
        customer_site_template: 'amethyst',
        appearance_preset: 'rose_gold',
      },
      error: null,
    })
    const repsChain = makeSelectSingle({
      data: {
        display_name: 'Jane',
        business_name: "Jane's Sparkle Party",
        email: 'jane@example.com',
        phone: null,
        social_handles: null,
      },
      error: null,
    })

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'site_settings') return siteSettingsChain.api
        if (table === 'reps') return repsChain.api
        throw new Error(`Unexpected table ${table}`)
      }),
    }

    const result = await updateSiteSettingsDashboard(supabase as never, 'rep-1', {
      customerSiteTemplate: 'some-other-template',
      appearancePreset: 'rose_gold',
    })

    expect(siteSettingsChain.spies.upsert).toHaveBeenCalledWith(
      {
        rep_id: 'rep-1',
        customer_site_template: 'amethyst',
        appearance_preset: 'rose_gold',
      },
      { onConflict: 'rep_id' },
    )
    expect(result.customerSiteTemplate).toBe('amethyst')
    expect(result.appearancePreset).toBe('rose_gold')
  })

  it.each([
    'garnet',
    'amber',
    'moonstone',
    'alpine_opal',
    'emerald_garden',
    'gnome_garden',
    'velvet',
    'rose_quartz',
  ] as const)(
    'saves the supported %s customer-facing site skin value',
    async (appearancePreset) => {
      const siteSettingsChain = makeUpsertSingle({
        data: {
          banner_text: null,
          banner_visible: false,
          ticker_text: null,
          ticker_visible: false,
          tagline: null,
          hero_image_url: null,
          hero_animation_type: 'sparkle_rise',
          team_name: null,
          show_join_page: true,
          customer_site_template: 'amethyst',
          appearance_preset: appearancePreset,
        },
        error: null,
      })
      const repsChain = makeSelectSingle({
        data: {
          display_name: 'Jane',
          business_name: "Jane's Sparkle Party",
          email: 'jane@example.com',
          phone: null,
          social_handles: null,
        },
        error: null,
      })

      const supabase = {
        from: vi.fn((table: string) => {
          if (table === 'site_settings') return siteSettingsChain.api
          if (table === 'reps') return repsChain.api
          throw new Error(`Unexpected table ${table}`)
        }),
      }

      const result = await updateSiteSettingsDashboard(supabase as never, 'rep-1', {
        customerSiteTemplate: 'some-other-template',
        appearancePreset,
      })

      expect(siteSettingsChain.spies.upsert).toHaveBeenCalledWith(
        {
          rep_id: 'rep-1',
          customer_site_template: 'amethyst',
          appearance_preset: appearancePreset,
        },
        { onConflict: 'rep_id' },
      )
      expect(result.customerSiteTemplate).toBe('amethyst')
      expect(result.appearancePreset).toBe(appearancePreset)
    },
  )
})
