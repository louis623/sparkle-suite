import type { AmethystHomepageTemplateData } from './homepage-template-data'
import type { AmethystHomepageEventCard } from './homepage-upcoming-shows'

/** Public navigation only. Calendar availability must never gate queue visibility. */
export function buildLineupCalendar(
  homepage: Pick<AmethystHomepageTemplateData, 'footerLinks'> & { showEvents?: boolean },
  events: AmethystHomepageEventCard[],
  now = Date.now(),
): { liveQueueCalendarHref: string | null } {
  const available = homepage.showEvents !== false && events.some(event => {
    const starts = Date.parse(event.eventTime)
    const duration = Math.max(0, Number(event.durationMinutes) || 0) * 60000
    return Number.isFinite(starts) && starts + duration >= now
  })
  const home = homepage.footerLinks.home?.trim() || ''
  const safe = home.startsWith('/') && !home.startsWith('//') && !/[\\\s]/u.test(home)
  return { liveQueueCalendarHref: available && safe ? home.split('#')[0] + '#events' : null }
}
