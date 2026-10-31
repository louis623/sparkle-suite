import { it, expect, vi, afterEach } from 'vitest'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { renderAmethystPageFirstPaint } from '@/lib/amethyst/page-first-paint'
import { buildAmethystHomepageBootstrapScript, defaultAmethystHomepageTemplateData as homepage } from '@/lib/amethyst/homepage-template-data'
import { buildAmethystTradeBootstrapScript, defaultAmethystTradeTemplateData as trade } from '@/lib/amethyst/trade-template-data'
import { buildAmethystJoinBootstrapScript, defaultAmethystJoinTemplateData as join } from '@/lib/amethyst/join-template-data'
afterEach(()=>vi.restoreAllMocks())
const out='node_modules/.cache/ssr-lindsey'
// Synthetic fixtures for the offline Chromium/WebKit stream + clock + tap test.
// No network, account, database or environment configuration is needed.
for(const preset of ['gilded_autumn','alpine_opal','fall_owl_harvest_moon','midnight_rose','rose_gold'] as const) {
  for(const page of ['homepage','join','trade'] as const) {
    if(!['gilded_autumn','alpine_opal'].includes(preset)&&page!=='homepage')continue
    it(`reserves complete MHF ${preset}/${page} copy and exports an offline browser fixture`,async()=>{
      vi.spyOn(Date,'now').mockReturnValue(1790000000000)
      const publicSiteVariant='mile_high_fizz_hybrid' as const
      const h={...homepage,publicSiteVariant,repName:'Lindsey',businessName:'Mile High Fizz',heroHeadline:'Mile High Fizz'}
      const tr={...trade,publicSiteVariant}, jn={...join,publicSiteVariant}
      const data={homepage:h,trade:tr,join:jn,appearancePreset:preset}
      const bootstrap=page==='homepage'?buildAmethystHomepageBootstrapScript(h,[],preset,{targeted:true}):page==='join'?buildAmethystJoinBootstrapScript(jn,preset,{targeted:true}):buildAmethystTradeBootstrapScript(tr,[],preset,{targeted:true})
      const html=await renderAmethystPageFirstPaint(page,readFileSync(`public/amethyst/${{homepage:'Homepage',join:'Join',trade:'Trade'}[page]}.html`,'utf8'),data,new URL(`http://localhost/milehighfizz/${page}`),bootstrap)
      expect(html).not.toMatch(/rel="expect"|blocking="render"|ssr-first-paint-ready/)
      if(page!=='trade') {
        expect(html.indexOf('data-ssr-reservation')).toBeGreaterThan(0)
        expect(html.indexOf('data-ssr-reservation')).toBeLessThan(html.indexOf('<h1'))
      }
      if(page==='homepage') {
        const initial=JSON.parse(html.match(/window.SPARKLE_FIRST_PAINT=([^<]+)<\/script>/)![1])
        expect(initial.now).toBe(1790000000000)
        expect(initial).toHaveProperty('lineup')
      }
      mkdirSync(out,{recursive:true});writeFileSync(`${out}/${preset}__${page}.html`,html)
    })
  }
}
it('preloads the amethyst opening frame only for motion, preserving the reduced-motion still',async()=>{
  const html=await renderAmethystPageFirstPaint('homepage',readFileSync('public/amethyst/Homepage.html','utf8'),{homepage,trade,join,appearancePreset:'amethyst'},new URL('http://localhost/'),buildAmethystHomepageBootstrapScript(homepage,[],'amethyst',{targeted:true}))
  expect(html).toMatch(/<link rel="preload" as="image"[^>]*href="\/amethyst\/skins\/am01-unicorn\/opening-poster.webp"[^>]*media="\(prefers-reduced-motion: no-preference\)"/)
})

it('exports a clock-bound grouped lineup that would expire under the skewed browser clock', async()=>{
  vi.spyOn(Date,'now').mockReturnValue(1790000000000)
  const h={...homepage,publicSiteVariant:'mile_high_fizz_hybrid' as const,repName:'Lindsey',businessName:'Mile High Fizz',
    liveQueuePresentation:'grouped-v1',liveQueueState:'live' as const,liveQueueSummary:'Synthetic lineup ready.',
    liveQueueLastUpdated:new Date().toISOString(),liveQueueEntries:[{position:1,name:'Synthetic Reviewer',label:'Currently Unboxing',highlight:true,token:'synthetic',remainingOrders:1}]}
  const html=await renderAmethystPageFirstPaint('homepage',readFileSync('public/amethyst/Homepage.html','utf8'),{homepage:h,trade,join,appearancePreset:'gilded_autumn'},new URL('http://localhost/milehighfizz'),buildAmethystHomepageBootstrapScript(h,[],'gilded_autumn',{targeted:true}))
  const initial=JSON.parse(html.match(/window.SPARKLE_FIRST_PAINT=([^<]+)<\/script>/)![1])
  expect(initial.lineup.liveQueueState).toBe('delayed')
  expect(initial.lineup.liveQueueEntries).toHaveLength(1)
  expect(initial.lineup).not.toHaveProperty('heroHeadline')
  mkdirSync(out,{recursive:true});writeFileSync(`${out}/clock_skew__homepage.html`,html)
})
