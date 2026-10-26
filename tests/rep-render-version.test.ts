import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import manifest from '@/lib/amethyst/legacy/manifest.json'
const {lookup}=vi.hoisted(()=>({lookup:vi.fn()}))
vi.mock('@/lib/supabase/admin',()=>({createAdminClient:()=>({})}))
vi.mock('@/lib/amethyst/preview-rep',()=>({resolveAmethystPreviewRep:lookup}))
import {repRenderV2Enabled,shouldUseRepRenderV2} from '@/lib/amethyst/rep-render-version'
import {legacyAssetFilePath,legacyStaticAssetResponse,legacyStaticAssetUrls} from '@/lib/amethyst/legacy-assets'
import {renderAmethystPublicAssetResponse} from '@/lib/amethyst/public-asset-response'
import {buildAmethystHomepageTweakDefaults as legacyTweaks,defaultAmethystHomepageTemplateData as legacyData} from '@/lib/amethyst/legacy/homepage-template-data'
import {buildAmethystHomepageTweakDefaults,defaultAmethystHomepageTemplateData} from '@/lib/amethyst/homepage-template-data'

beforeEach(()=>{vi.stubEnv('REP_RENDER_V2_SLUGS',undefined);lookup.mockReset()})
afterEach(()=>vi.unstubAllEnvs())
it('defaults to nobody and only matches complete normalized slugs or explicit wildcard',()=>{
 expect(repRenderV2Enabled('dudesfizzfest')).toBe(false)
 expect(repRenderV2Enabled('dudesfizzfest','')).toBe(false)
 expect(repRenderV2Enabled('DudesFizzFest','milehighfizz, dudesfizzfest')).toBe(true)
 expect(repRenderV2Enabled('dudesfizzfest-extra','dudesfizzfest')).toBe(false)
 expect(repRenderV2Enabled('any-rep','*')).toBe(true)
})
it('does not enable V2 through request headers or a spoofed slug alongside another rep ID',async()=>{
 const request=new Request('https://example.com/api/amethyst/homepage-template?c=another-rep&publicSiteSlug=dudesfizzfest',{headers:{'x-rep-render-v2':'*'}})
 expect(await shouldUseRepRenderV2(request)).toBe(false)
 vi.stubEnv('REP_RENDER_V2_SLUGS','dudesfizzfest')
 vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://test.invalid')
 vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','unit-test-only')
 lookup.mockResolvedValue({public_site_slug:'another-rep'})
 expect(await shouldUseRepRenderV2(request)).toBe(false)
 lookup.mockResolvedValue({public_site_slug:'dudesfizzfest'})
 expect(await shouldUseRepRenderV2(request)).toBe(true)
 lookup.mockRejectedValue(Error('unavailable'))
 expect(await shouldUseRepRenderV2(request)).toBe(false)
})
it('serves V2 HTML only for the server-verified allowlisted slug and legacy HTML/assets otherwise',async()=>{
 vi.stubEnv('REP_RENDER_V2_SLUGS','dudesfizzfest')
 const render=(slug:string)=>renderAmethystPublicAssetResponse(new Request('https://example.com/'+slug),['Homepage.html'],{repIdOverride:'unit-rep',publicSiteSlugOverride:slug})
 const legacy=await (await render('other-shop')).text()
 expect(legacy).not.toContain('data-server-rendered="true"')
 expect(legacy).toContain('/amethyst/render-v1/homepage.jsx')
 expect(legacy).toContain('text/babel')
 const current=await (await render('dudesfizzfest')).text()
 expect(current).toContain('data-server-rendered="true"')
 expect(current).toContain('/amethyst/compiled/homepage.js')
 expect(current).not.toContain('/amethyst/render-v1/')
})
it('retains pinned legacy Still handling while the allowlisted path restores motion',()=>{
 expect(legacyTweaks({...legacyData,heroMotion:'still'},'amethyst').heroMotion).toBe('still')
 expect(buildAmethystHomepageTweakDefaults({...defaultAmethystHomepageTemplateData,heroMotion:'still'},'amethyst').heroMotion).not.toBe('still')
})
it('keeps every pinned legacy asset byte-for-byte before static namespace adaptation',()=>{
 for(const [asset,record] of Object.entries(manifest.files)){
  const file=legacyAssetFilePath(asset)
  expect(file,asset).toBeTruthy()
  expect(createHash('sha256').update(readFileSync(file!)).digest('hex'),asset).toBe(record.sha256)
 }
 expect(legacyAssetFilePath('../homepage.jsx')).toBeNull()
 expect(legacyAssetFilePath('__proto__')).toBeNull()
 expect(legacyStaticAssetUrls('/api/amethyst/homepage-template /amethyst/homepage.jsx')).toBe('/api/amethyst/homepage-template /amethyst/render-v1/homepage.jsx')
})
it('serves the original legacy controller source, including video range requests',async()=>{
 const response=await legacyStaticAssetResponse(['am01-unicorn.js'])
 const source=(await response.text()).replaceAll('/amethyst/render-v1/','/amethyst/')
 expect(createHash('sha256').update(source).digest('hex')).toBe(manifest.files['am01-unicorn.js'].sha256)
 const movie=Object.keys(manifest.files).find(name=>name.endsWith('.mp4'))!
 const range=await legacyStaticAssetResponse(movie.split('/'),new Request('https://example.com/movie',{headers:{range:'bytes=0-9'}}))
 expect(range.status).toBe(206)
 expect((await range.arrayBuffer()).byteLength).toBe(10)
})
