import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { DEFAULT_AMETHYST_APPEARANCE_PRESET, getAmethystAppearancePreset, normalizeAmethystAppearancePreset } from '@/lib/amethyst/appearance-presets'
import { getCommunityAmethystSkinCards, normalizeAmethystSkinSelection } from '@/lib/amethyst/skin-cards'
import { getAvailableAmethystSkinCardsForRep, isAmethystSkinSelectionAvailableToRep } from '@/lib/amethyst/skin-access'
import { buildAmethystHomepageTweakDefaults, defaultAmethystHomepageTemplateData } from '@/lib/amethyst/homepage-template-data'
import { buildAmethystTradeTweakDefaults, defaultAmethystTradeTemplateData } from '@/lib/amethyst/trade-template-data'
import { buildAmethystJoinTweakDefaults, defaultAmethystJoinTemplateData } from '@/lib/amethyst/join-template-data'
import { GET } from '@/app/skin-preview/[skin]/[page]/route'

const id = 'gilded_autumn'
describe('Gilded Autumn Community integration', () => {
  it('resolves the name and card code while leaving the current default intact', () => {
    expect(normalizeAmethystAppearancePreset(id)).toBe(id)
    for (const choice of ['GA-01', 'Gilded Autumn', id]) expect(normalizeAmethystSkinSelection(choice)).toBe(id)
    expect(DEFAULT_AMETHYST_APPEARANCE_PRESET).toBe('sparkle_suite_morganite')
    expect(normalizeAmethystAppearancePreset('unknown')).toBe(DEFAULT_AMETHYST_APPEARANCE_PRESET)
    expect(getCommunityAmethystSkinCards().find(card => card.id === id)).toMatchObject({code:'GA-01',visibility:'community'})
  })
  it('uses identical visual tokens with original actions and content on all three template bootstraps', () => {
    const results = [buildAmethystHomepageTweakDefaults(defaultAmethystHomepageTemplateData,id),buildAmethystTradeTweakDefaults(defaultAmethystTradeTemplateData,id),buildAmethystJoinTweakDefaults(defaultAmethystJoinTemplateData,id)]
    const {heroMotion, ...visualValues}=getAmethystAppearancePreset(id).values
    expect(heroMotion).toBe('autumn_leaves')
    for (const result of results) expect(result).toMatchObject({ ...visualValues, preset:id })
    expect(results[0].heroMotion).toBe(defaultAmethystHomepageTemplateData.heroMotion)
    expect(results[0]).toMatchObject({showNicNac:true, headingFont:'playfair',bodyFont:'dmSans',headingWeight:500,shapeRadius:'soft',density:'regular',saturation:100})
  })
  it('normalizes GA-01 before consulting the same account policy used by pickers and writes', async () => {
    const rpc = vi.fn(async (name:string, args:Record<string,string>) => ({data:name === 'list_available_amethyst_skin_ids' ? [{skin_id:id}] : args.p_skin_id === id,error:null}))
    expect(await getAvailableAmethystSkinCardsForRep({rpc} as never,'regular-rep')).toMatchObject([{id,visibility:'community'}])
    expect(await isAmethystSkinSelectionAvailableToRep({rpc} as never,'GA-01','regular-rep')).toBe(true)
    expect(rpc).toHaveBeenCalledWith('amethyst_skin_is_available_to_rep',{p_rep_id:'regular-rep',p_skin_id:id})
  })
  it.each(['homepage','trade','join','unsubscribe'] as const)('serves %s sample content with media confined to the skin and no provider access', async page => {
    const origin='https://www.yoursparklesuite.com'
    const response=await GET(new Request(`${origin}/skin-preview/${id}/${page}`),{params:Promise.resolve({skin:id,page})})
    expect(response.status).toBe(200)
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow')
    expect(response.headers.get('Content-Security-Policy')).toContain(`media-src ${origin}/amethyst/skins/gilded-autumn/;`)
    expect(response.headers.get('Content-Security-Policy')).toContain("connect-src 'none'; form-action 'none'")
    const html=await response.text()
    expect(html).toContain('gilded-autumn.css')
    expect(html).toContain('Sample content')
    expect(html).toContain('sandbox="allow-scripts"')
    expect(html).not.toContain('allow-same-origin')
  })
  it('applies the additive database migration without replacing any saved choice or private assignment', async () => {
    const db=new PGlite()
    try {
      await db.exec(`CREATE TABLE site_settings(rep_id text primary key,appearance_preset text); CREATE TABLE amethyst_skin_catalog(skin_id text primary key,visibility text,owner_rep_id text,allow_internal_demo boolean); INSERT INTO site_settings VALUES('existing','pearl'),('private','black_diamond'); INSERT INTO amethyst_skin_catalog VALUES('black_diamond','private','owner',true);`)
      await db.exec(readFileSync('supabase/migrations/20260930000100_add_gilded_autumn.sql','utf8'))
      expect((await db.query('SELECT * FROM site_settings ORDER BY rep_id')).rows).toEqual([{rep_id:'existing',appearance_preset:'pearl'},{rep_id:'private',appearance_preset:'black_diamond'}])
      expect((await db.query("SELECT * FROM amethyst_skin_catalog WHERE skin_id='gilded_autumn'")).rows).toEqual([{skin_id:id,visibility:'community',owner_rep_id:null,allow_internal_demo:false}])
      await db.exec("INSERT INTO site_settings VALUES ('new-rep','gilded_autumn')")
      await expect(db.exec("INSERT INTO site_settings VALUES ('bad','not-a-skin')")).rejects.toThrow()
      expect((await db.query("SELECT owner_rep_id FROM amethyst_skin_catalog WHERE skin_id='black_diamond'")).rows).toEqual([{owner_rep_id:'owner'}])
    } finally { await db.close() }
  },20000)
})
