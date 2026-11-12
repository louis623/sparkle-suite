import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { it, expect } from 'vitest'
import { SiteSettingsCard, getSiteSettingsDraft } from '@/app/nic-nac/components/DashboardPlaceholder'
import type { SiteSettingsDashboardResult } from '@/lib/services/types'

function render(videoUrl: string, status: 'queued'|'live'|null, enabled=true) {
  const settings = {
    displayName:'Reviewer',businessName:'Test Site',email:'reviewer@example.test',phone:'',
    bannerText:'',bannerVisible:false,tickerText:'',tickerVisible:false,tagline:'',heroImageUrl:'',
    heroAnimationType:'still',teamName:'',memberTeamName:'',recruitingLink:'',showJoinPage:true,
    customerSiteTemplate:'amethyst',appearancePreset:'amethyst',socialHandles:{},
    tiktokQueueEnabled:enabled,homepageMediaSlots:[{key:'showcase',videoUrl,caption:'',imageUrl:'',tiktokVideoStatus:status}],
  } as SiteSettingsDashboardResult
  return renderToStaticMarkup(createElement(SiteSettingsCard,{
    state:{status:'ready',settings},draft:getSiteSettingsDraft(settings),
  }))
}
it('tiktok remove: ready and queued filled fields are read-only and show Remove video', () => {
  for (const status of ['queued','live'] as const) {
    const html=render('https://www.tiktok.com/embed/12345678',status)
    expect(html).toMatch(/value="https:\/\/www.tiktok.com\/embed\/12345678"/)
    expect(html).toMatch(/readOnly=""/i)
    expect(html).toContain('Remove video')
    expect(html).toContain('Remove this video before adding a new link.')
  }
})
it('tiktok remove: emptied slot unlocks for a new link and gate-off UI is unchanged', () => {
  const empty=render('',null)
  expect(empty).not.toMatch(/readonly=/i)
  expect(empty).not.toContain('Remove video')
  const off=render('https://www.tiktok.com/embed/12345678',null,false)
  expect(off).not.toMatch(/readonly=/i)
  expect(off).not.toContain('Remove video')
})
