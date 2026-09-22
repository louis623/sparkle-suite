import { beforeEach, describe, expect, it, vi } from 'vitest'

const logIncidentMock = vi.fn()

vi.mock('@/lib/nic-nac/guardian-telemetry', () => ({
  logIncident: (...args: unknown[]) => logIncidentMock(...args),
  logToolExecution: vi.fn().mockResolvedValue(undefined),
}))

import { makeUpdateBannerTextTool, updateBannerTextTool } from '@/lib/nic-nac/tools/update-banner-text'
import {
  makeUpdateStreamingLinksTool,
  updateStreamingLinksTool,
} from '@/lib/nic-nac/tools/update-streaming-links'
import {
  makeUpdateSiteSettingTool,
  updateSiteSettingTool,
} from '@/lib/nic-nac/tools/update-site-setting'
import { buildAllTools } from '@/lib/nic-nac/tools'
import { NIC_NAC_SYSTEM_PROMPT } from '@/lib/nic-nac/system-prompt'

interface ToolDef {
  execute: (input: unknown) => Promise<Record<string, unknown>>
  needsApproval?: boolean
}

function makeUpdateChain<T>(response: { data: T | null; error: unknown }) {
  const single = vi.fn().mockResolvedValue(response)
  const select = vi.fn(() => ({ single }))
  const eq = vi.fn(() => ({ select }))
  const update = vi.fn(() => ({ eq }))
  return {
    api: { update },
    spies: { update, eq, select, single },
  }
}

function makeCtx(supabase: {
  from: (table: string) => unknown
  rpc?: (name: string, args: Record<string, string>) => unknown
}) {
  return {
    repId: 'rep-1',
    supabase: {
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
      ...supabase,
    } as never,
    conversationId: 'conv-1',
    runId: 'run-1',
  }
}

beforeEach(() => {
  logIncidentMock.mockReset()
})

describe('site customization tools', () => {
  it('update_banner_text writes banner_text + banner_visible:true to site_settings and returns the new banner copy', async () => {
    const chain = makeUpdateChain({
      data: {
        banner_text: 'Going live at 8 tonight',
        banner_visible: true,
      },
      error: null,
    })
    const from = vi.fn(() => chain.api)
    const tool = makeUpdateBannerTextTool(makeCtx({ from })) as unknown as ToolDef

    const result = await tool.execute({
      bannerText: 'Going live at 8 tonight',
    })

    expect(from).toHaveBeenCalledWith('site_settings')
    expect(chain.spies.update).toHaveBeenCalledWith({
      banner_text: 'Going live at 8 tonight',
      banner_visible: true,
    })
    expect(chain.spies.eq).toHaveBeenCalledWith('rep_id', 'rep-1')
    expect(result).toEqual({
      bannerText: 'Going live at 8 tonight',
      bannerVisible: true,
    })
  })

  it('update_banner_text translates a Supabase write failure into a NicNacToolError', async () => {
    const chain = makeUpdateChain({
      data: null,
      error: { message: 'row update failed' },
    })
    const tool = makeUpdateBannerTextTool(
      makeCtx({ from: vi.fn(() => chain.api) }),
    ) as unknown as ToolDef

    await expect(
      tool.execute({ bannerText: 'new banner' }),
    ).rejects.toMatchObject({
      name: 'NicNacToolError',
      code: 'SITE_SETTINGS_UPDATE_FAILED',
    })
  })

  it('update_streaming_links replaces the full reps.streaming_links object and returns the updated links', async () => {
    const links = {
      tiktok: 'https://www.tiktok.com/@sparkles',
      youtube: 'https://www.youtube.com/@sparkles',
    }
    const chain = makeUpdateChain({
      data: { streaming_links: links },
      error: null,
    })
    const from = vi.fn(() => chain.api)
    const tool = makeUpdateStreamingLinksTool(
      makeCtx({ from }),
    ) as unknown as ToolDef

    const result = await tool.execute({ streamingLinks: links })

    expect(from).toHaveBeenCalledWith('reps')
    expect(chain.spies.update).toHaveBeenCalledWith({
      streaming_links: links,
    })
    expect(chain.spies.eq).toHaveBeenCalledWith('id', 'rep-1')
    expect(result).toEqual({
      streamingLinks: links,
      platforms: ['tiktok', 'youtube'],
    })
  })

  it('update_site_setting rejects an empty patch before touching Supabase', async () => {
    const from = vi.fn()
    const tool = makeUpdateSiteSettingTool(
      makeCtx({ from }),
    ) as unknown as ToolDef

    await expect(tool.execute({})).rejects.toMatchObject({
      name: 'NicNacToolError',
      code: 'NO_SITE_SETTING_FIELDS',
    })
    expect(from).not.toHaveBeenCalled()
  })

  it('update_site_setting rejects Kelly\'s private skin for another rep', async () => {
    const from = vi.fn()
    const tool = makeUpdateSiteSettingTool(
      makeCtx({
        from,
        rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
      }),
    ) as unknown as ToolDef

    await expect(tool.execute({ appearancePreset: 'NB-01' })).rejects.toMatchObject({
      name: 'NicNacToolError',
      code: 'SITE_SKIN_NOT_AVAILABLE',
    })
    expect(from).not.toHaveBeenCalled()
  })

  it('update_site_setting patches site_settings fields, updates reps.social_handles separately, and returns only the changed values', async () => {
    const siteSettingsChain = makeUpdateChain({
      data: {
        banner_text: null,
        banner_visible: false,
        ticker_text: null,
        ticker_visible: false,
        tagline: 'Fresh drops daily',
        hero_headline: 'A little wonder, a lot of sparkle.',
        hero_subtitle: 'Settle in for live reveals and friendly faces.',
        hero_image_url: null,
        hero_animation_type: 'soft_glow',
        team_name: null,
        show_join_page: false,
        customer_site_template: 'amethyst',
        appearance_preset: 'sparkle_suite_morganite',
        about_heading: 'Meet Heather',
        about_subheading: 'HEATHER DAUGHERTY · OHIO',
        about_narrative: 'Heather shares beautiful jewelry and a welcoming community.',
      },
      error: null,
    })
    const repsChain = makeUpdateChain({
      data: {
        social_handles: {
          instagram: '@sparklesquad',
        },
      },
      error: null,
    })
    const from = vi.fn((table: string) => {
      if (table === 'site_settings') return siteSettingsChain.api
      if (table === 'reps') return repsChain.api
      throw new Error(`Unexpected table ${table}`)
    })
    const tool = makeUpdateSiteSettingTool(
      makeCtx({ from }),
    ) as unknown as ToolDef

    const result = await tool.execute({
      tagline: 'Fresh drops daily',
      heroTitle: 'A little wonder, a lot of sparkle.',
      heroSubtitle: 'Settle in for live reveals and friendly faces.',
      heroAnimationType: 'soft_glow',
      showJoinPage: false,
      customerSiteTemplate: 'not-a-real-template',
      appearancePreset: 'SS-01',
      aboutHeading: 'Meet Heather',
      aboutSubheading: 'HEATHER DAUGHERTY · OHIO',
      aboutNarrative: 'Heather shares beautiful jewelry and a welcoming community.',
      socialHandles: {
        instagram: '@sparklesquad',
      },
    })

    expect(siteSettingsChain.spies.update).toHaveBeenCalledWith({
      tagline: 'Fresh drops daily',
      hero_headline: 'A little wonder, a lot of sparkle.',
      hero_subtitle: 'Settle in for live reveals and friendly faces.',
      hero_animation_type: 'soft_glow',
      show_join_page: false,
      customer_site_template: 'amethyst',
      appearance_preset: 'sparkle_suite_morganite',
      about_heading: 'Meet Heather',
      about_subheading: 'HEATHER DAUGHERTY · OHIO',
      about_narrative: 'Heather shares beautiful jewelry and a welcoming community.',
    })
    expect(siteSettingsChain.spies.eq).toHaveBeenCalledWith('rep_id', 'rep-1')
    expect(repsChain.spies.update).toHaveBeenCalledWith({
      social_handles: {
        instagram: '@sparklesquad',
      },
    })
    expect(repsChain.spies.eq).toHaveBeenCalledWith('id', 'rep-1')
    expect(result).toEqual({
      updatedFields: [
        'tagline',
        'heroTitle',
        'heroSubtitle',
        'heroAnimationType',
        'showJoinPage',
        'customerSiteTemplate',
        'appearancePreset',
        'aboutHeading',
        'aboutSubheading',
        'aboutNarrative',
        'socialHandles',
      ],
      updated: {
        tagline: 'Fresh drops daily',
        heroTitle: 'A little wonder, a lot of sparkle.',
        heroSubtitle: 'Settle in for live reveals and friendly faces.',
        heroAnimationType: 'soft_glow',
        showJoinPage: false,
        customerSiteTemplate: 'amethyst',
        appearancePreset: 'sparkle_suite_morganite',
        aboutHeading: 'Meet Heather',
        aboutSubheading: 'HEATHER DAUGHERTY · OHIO',
        aboutNarrative: 'Heather shares beautiful jewelry and a welcoming community.',
        socialHandles: {
          instagram: '@sparklesquad',
        },
      },
    })
  })

  it('update_site_setting saves Black Diamond when Nic-Nac receives the skin code', async () => {
    const siteSettingsChain = makeUpdateChain({
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
    const from = vi.fn(() => siteSettingsChain.api)
    const tool = makeUpdateSiteSettingTool(
      makeCtx({ from }),
    ) as unknown as ToolDef

    const result = await tool.execute({
      appearancePreset: 'BD-01',
    })

    expect(siteSettingsChain.spies.update).toHaveBeenCalledWith({
      appearance_preset: 'black_diamond',
    })
    expect(result).toEqual({
      updatedFields: ['appearancePreset'],
      updated: {
        appearancePreset: 'black_diamond',
      },
    })
  })

  it('update_site_setting saves Rose Gold when Nic-Nac receives the skin code', async () => {
    const siteSettingsChain = makeUpdateChain({
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
    const from = vi.fn(() => siteSettingsChain.api)
    const tool = makeUpdateSiteSettingTool(
      makeCtx({ from }),
    ) as unknown as ToolDef

    const result = await tool.execute({
      appearancePreset: 'RG-01',
    })

    expect(siteSettingsChain.spies.update).toHaveBeenCalledWith({
      appearance_preset: 'rose_gold',
    })
    expect(result).toEqual({
      updatedFields: ['appearancePreset'],
      updated: {
        appearancePreset: 'rose_gold',
      },
    })
  })

  it.each([
    ['GN-01', 'garnet'],
    ['AB-01', 'amber'],
    ['MS-01', 'moonstone'],
    ['AO-01', 'alpine_opal'],
    ['EG-01', 'emerald_garden'],
    ['gnome_garden', 'gnome_garden'],
    ['GG-01', 'gnome_garden'],
    ['Gnome Forest', 'gnome_garden'],
    ['Enchanted Gnome Forest', 'gnome_garden'],
    ['Enchanted Gnome Garden', 'gnome_garden'],
    ['Gnome Garden', 'gnome_garden'],
    ['VE-01', 'velvet'],
    ['RQ-01', 'rose_quartz'],
  ])('update_site_setting saves %s as the supported customer-facing skin code', async (code, expectedPreset) => {
    const siteSettingsChain = makeUpdateChain({
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
        appearance_preset: expectedPreset,
      },
      error: null,
    })
    const from = vi.fn(() => siteSettingsChain.api)
    const tool = makeUpdateSiteSettingTool(
      makeCtx({ from }),
    ) as unknown as ToolDef

    const result = await tool.execute({
      appearancePreset: code,
    })

    expect(siteSettingsChain.spies.update).toHaveBeenCalledWith({
      appearance_preset: expectedPreset,
    })
    expect(siteSettingsChain.spies.update).toHaveBeenCalledTimes(1)
    expect(siteSettingsChain.spies.eq).toHaveBeenCalledWith('rep_id', 'rep-1')
    expect(from).toHaveBeenCalledWith('site_settings')
    expect(result).toEqual({
      updatedFields: ['appearancePreset'],
      updated: {
        appearancePreset: expectedPreset,
      },
    })
  })
})

describe('site customization registry and prompt wiring', () => {
  it('registers the three new site tools and preserves their write metadata', () => {
    const tools = buildAllTools(makeCtx({ from: vi.fn() }))
    const names = Object.keys(tools).sort()

    expect(new Set(names).size).toBe(names.length)
    expect(names).toEqual(
      expect.arrayContaining([
        'update_banner_text',
        'update_streaming_links',
        'update_site_setting',
      ]),
    )
    expect(updateBannerTextTool.readOnly).toBe(false)
    expect(updateStreamingLinksTool.readOnly).toBe(false)
    expect(updateSiteSettingTool.readOnly).toBe(false)
  })

  it('system prompt documents site customization tools and the customer-facing appearance rule', () => {
    expect(NIC_NAC_SYSTEM_PROMPT).toContain(
      "You have a scoped set of workspace tools available when the rep's request calls for them:",
    )
    expect(NIC_NAC_SYSTEM_PROMPT).toContain('update_banner_text')
    expect(NIC_NAC_SYSTEM_PROMPT).toContain('update_streaming_links')
    expect(NIC_NAC_SYSTEM_PROMPT).toContain('update_site_setting')
    expect(NIC_NAC_SYSTEM_PROMPT).toContain('banner text')
    expect(NIC_NAC_SYSTEM_PROMPT).toContain('social handles')
    expect(NIC_NAC_SYSTEM_PROMPT).toContain('Amethyst')
    expect(NIC_NAC_SYSTEM_PROMPT).toContain('Sparkle Suite/Morganite')
    expect(NIC_NAC_SYSTEM_PROMPT).toContain('change the customer-facing Amethyst site theme')
    expect(NIC_NAC_SYSTEM_PROMPT).toContain('The Sparkle Suite Workspace keeps the standard workspace theme')
    expect(NIC_NAC_SYSTEM_PROMPT).toContain('BD-01')
    expect(NIC_NAC_SYSTEM_PROMPT).toContain('Black Diamond')
    expect(NIC_NAC_SYSTEM_PROMPT).toContain('AO-01')
    expect(NIC_NAC_SYSTEM_PROMPT).toContain('Alpine Opal')
    expect(NIC_NAC_SYSTEM_PROMPT).toContain('RG-01')
    expect(NIC_NAC_SYSTEM_PROMPT).toContain('Rose Gold')
  })
})
