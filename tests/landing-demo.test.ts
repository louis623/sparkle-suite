import { describe, it, expect, vi } from 'vitest'
import { communityLandingThemes, exactLandingTheme, permittedLandingTheme, type LandingDemo } from '@/lib/sparkle-suite/landing-demo-model'
import { landingDemoSlug, loadLandingDemo } from '@/lib/sparkle-suite/landing-demo'
import { landingPreviewDocument } from '@/lib/sparkle-suite/landing-demo-preview'
import { POST as chat } from '@/app/api/public/nic-nac/route'
import { POST as handoff } from '@/app/api/public/nic-nac/handoff/route'
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }))

const demo: LandingDemo = {slug:'dudesfizzfest',businessName:'Demo',theme:'neon_butterfly',themeLabel:'Neon Butterfly',headline:'Hello',subtitle:'Welcome',ticker:'',themes:[{id:'rose_gold',label:'Rose Gold',colors:[]}]}
describe('public landing theme boundary', () => {
  it('never replaces missing or unknown saved themes with a default', () => {
    expect(exactLandingTheme(null)).toBeNull()
    expect(exactLandingTheme('not-a-theme')).toBeNull()
    expect(exactLandingTheme('rose_quartz')).toBe('rose_quartz')
    expect(exactLandingTheme('neon_butterfly')).toBe('neon_butterfly')
  })
  it('intersects community catalog rows with selectable community definitions', () => {
    expect(communityLandingThemes([
      {skin_id:'rose_gold',visibility:'community'},
      {skin_id:'neon_butterfly',visibility:'community'},
      {skin_id:'rose_quartz',visibility:'community'},
      {skin_id:'garnet',visibility:'private'},
    ]).map(theme => theme.id)).toEqual(['rose_gold'])
    expect(communityLandingThemes([])).toEqual([])
  })
  it('allows the saved private default but not arbitrary private choices', () => {
    expect(permittedLandingTheme(demo,null)).toBe('neon_butterfly')
    expect(permittedLandingTheme(demo,'rose_gold')).toBe('rose_gold')
    expect(permittedLandingTheme(demo,'black_diamond')).toBeNull()
    expect(permittedLandingTheme(demo,'rose_quartz')).toBeNull()
  })
  it('keeps Smoke and Live configuration separate', () => {
    expect(landingDemoSlug({SPARKLE_ENVIRONMENT:'smoke',NEXT_PUBLIC_SPARKLE_ENVIRONMENT:'smoke'} as NodeJS.ProcessEnv)).toBe('dudesfizzfest')
    expect(landingDemoSlug({} as NodeJS.ProcessEnv)).toBeNull()
    expect(landingDemoSlug({SPARKLE_LANDING_DEMO_SLUG:'../private'} as NodeJS.ProcessEnv)).toBeNull()
  })
  it('looks up by slug and passes the resulting ID only to the settings query', async () => {
    const calls: unknown[] = []
    const from = vi.fn((table: string) => {
      const result = table === 'reps' ? {data:{id:'smoke-only-id',business_name:'Demo'}} : table === 'site_settings' ? {data:{appearance_preset:'rose_quartz'}} : {data:[]}
      const query: Record<string,unknown> = {}
      for(const method of ['select','eq','abortSignal']) query[method] = (...args: unknown[]) => {calls.push([table,method,...args]);return query}
      query.maybeSingle = async () => result
      query.then = (done: (value:unknown)=>unknown) => Promise.resolve(result).then(done)
      return query
    })
    const result = await loadLandingDemo('dudesfizzfest',{from} as never)
    expect(result.theme).toBe('rose_quartz')
    expect(calls).toContainEqual(['reps','eq','public_site_slug','dudesfizzfest'])
    expect(calls).toContainEqual(['site_settings','eq','rep_id','smoke-only-id'])
    expect(result).not.toHaveProperty('id')
    expect(result).not.toHaveProperty('email')
  })
  it('renders exact custom appearance without live API bootstrap or forms', async () => {
    const html=await landingPreviewDocument(demo,'neon_butterfly','https://smoke.example')
    expect(html).toContain('"preset":"neon_butterfly"')
    expect(html).toContain('showNicNac:false,showSignup:false')
    expect(html).toContain("connect-src 'none'")
    expect(html).toContain("form-action 'none'")
    expect(html).not.toContain('data-template-src=')
    expect(html).not.toContain('SUPABASE_SERVICE_ROLE_KEY')
    expect(html).toContain('sparkle-landing-ready')
  })
  it('retires both anonymous assistant paths without parsing user data', async () => {
    expect((await chat()).status).toBe(410)
    expect((await handoff()).status).toBe(410)
  })
})
