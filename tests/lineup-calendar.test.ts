import { describe, expect, it } from 'vitest'
import { buildLineupCalendar } from '@/lib/amethyst/lineup-calendar'
import { defaultAmethystHomepageTemplateData as defaults } from '@/lib/amethyst/homepage-template-data'
import { defaultAmethystHomepageEvents } from '@/lib/amethyst/homepage-upcoming-shows'

const now = Date.parse('2026-10-02T18:00:00Z')
const events = [{ ...defaultAmethystHomepageEvents[0], eventTime: '2026-10-03T18:00:00Z' }]
describe('empty lineup calendar navigation', () => {
  for (const home of ['/amethyst/Homepage.html?c=sample-rep', '/smokecodex', '/', '/skin-preview/amethyst/homepage']) {
    it('preserves the correct customer target: '+home, () => {
      expect(buildLineupCalendar({ ...defaults, footerLinks:{...defaults.footerLinks,home} },events,now)).toEqual({liveQueueCalendarHref:home+'#events'})
    })
  }
  it('replaces an existing fragment without losing tenant query', () => {
    expect(buildLineupCalendar({...defaults, footerLinks:{...defaults.footerLinks,home:'/amethyst/Homepage.html?c=rep#top'}},events,now).liveQueueCalendarHref).toBe('/amethyst/Homepage.html?c=rep#events')
  })
  it('does not link to hidden or absent events', () => {
    expect(buildLineupCalendar({...defaults,showEvents:false},events,now).liveQueueCalendarHref).toBeNull()
    expect(buildLineupCalendar(defaults,[],now).liveQueueCalendarHref).toBeNull()
  })
  it('does not link to expired or malformed events', () => {
    for (const eventTime of ['garbage','2026-10-01T18:00:00Z']) expect(buildLineupCalendar(defaults,[{...events[0],eventTime}],now).liveQueueCalendarHref).toBeNull()
  })
  it('keeps currently running events available', () => {
    expect(buildLineupCalendar(defaults,[{...events[0],eventTime:'2026-10-02T17:30:00Z',durationMinutes:60}],now).liveQueueCalendarHref).not.toBeNull()
  })
  for(const home of ['https://other-rep.test','//other-rep.test','javascript:alert(1)','/\\other-rep.test','/path with space','#top']) {
    it('rejects unsafe or unusable destination '+home,()=>expect(buildLineupCalendar({...defaults,footerLinks:{...defaults.footerLinks,home}},events,now).liveQueueCalendarHref).toBeNull())
  }
})
