import { describe, expect, it, vi } from 'vitest'
import { buildPublicSiteVisibilityCss, resolvePublicSiteVisibility } from '@/lib/public-site/visibility'
import { updateSiteSettingsDashboard } from '@/lib/services/site-settings'

describe('customer-site visibility', () => {
  it('preserves existing announcement and Join Team choices and defaults new sections on', () => {
    expect(resolvePublicSiteVisibility({ tickerVisible: false, showJoinPage: true, joinTeamAccessEnabled: false })).toEqual({ announcements: false, joinTeam: false, danceFloor: true, liveLineup: true })
  })
  it('keeps the two ticker rows independent', () => {
    expect(buildPublicSiteVisibilityCss({ announcements: false, danceFloor: true })).toContain('.hp-ticker-row:not(.reverse)')
    expect(buildPublicSiteVisibilityCss({ announcements: false, danceFloor: true })).not.toContain('.hp-ticker-row.reverse')
    expect(buildPublicSiteVisibilityCss({ announcements: true, danceFloor: false })).not.toContain('.hp-ticker-row:not(.reverse)')
    expect(buildPublicSiteVisibilityCss({ announcements: false, danceFloor: false })).toContain('.hp-ticker {')
  })
  it.each(['tickerVisible', 'showJoinPage', 'danceFloorVisible', 'liveLineupVisible'])('rejects a non-boolean %s before any database mutation', async (key) => {
    const from = vi.fn()
    await expect(updateSiteSettingsDashboard({ from } as never, 'rep-test', { [key]: 'false' } as never)).rejects.toThrow()
    expect(from).not.toHaveBeenCalled()
  })
  it('restores the normal presentation when switches are on', () => {
    expect(buildPublicSiteVisibilityCss({ announcements: true, danceFloor: true, liveLineup: true, joinTeam: true })).toBe('')
  })
})
