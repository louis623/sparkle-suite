import { beforeEach, describe, expect, it, vi } from 'vitest'

const createAdminClientMock = vi.fn()
const resolveAmethystPreviewRepMock = vi.fn()
const getSiteSettingsDashboardMock = vi.fn()
const renderAmethystPublicAssetResponseMock = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: (...args: unknown[]) => createAdminClientMock(...args),
}))

vi.mock('@/lib/amethyst/preview-rep', () => ({
  resolveAmethystPreviewRep: (...args: unknown[]) =>
    resolveAmethystPreviewRepMock(...args),
}))

vi.mock('@/lib/services/site-settings', () => ({
  getSiteSettingsDashboard: (...args: unknown[]) =>
    getSiteSettingsDashboardMock(...args),
}))

vi.mock('@/lib/amethyst/public-asset-response', () => ({
  renderAmethystPublicAssetResponse: (...args: unknown[]) =>
    renderAmethystPublicAssetResponseMock(...args),
}))

import { GET } from '@/app/[publicSiteSlug]/join/route'

describe('public Join Team route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createAdminClientMock.mockReturnValue({ marker: 'admin' })
    resolveAmethystPreviewRepMock.mockResolvedValue({ id: 'rep-1', email: 'rep@example.com' })
    renderAmethystPublicAssetResponseMock.mockResolvedValue(new Response('join page'))
  })

  it('serves Join Team for every rep when their visibility setting is enabled', async () => {
    getSiteSettingsDashboardMock.mockResolvedValue({
      joinTeamAccessEnabled: false,
      showJoinPage: true,
    })

    const response = await GET(
      new Request('https://www.yoursparklesuite.com/goforthebling/join'),
      { params: Promise.resolve({ publicSiteSlug: 'goforthebling' }) },
    )

    expect(response.status).toBe(200)
    expect(renderAmethystPublicAssetResponseMock).toHaveBeenCalled()
  })

  it('serves the route when the rep visibility setting is enabled', async () => {
    getSiteSettingsDashboardMock.mockResolvedValue({
      joinTeamAccessEnabled: true,
      showJoinPage: true,
    })

    const response = await GET(
      new Request('https://www.yoursparklesuite.com/milehighfizz/join'),
      { params: Promise.resolve({ publicSiteSlug: 'milehighfizz' }) },
    )

    expect(response.status).toBe(200)
    expect(getSiteSettingsDashboardMock).toHaveBeenCalledWith({ marker: 'admin' }, 'rep-1')
    expect(renderAmethystPublicAssetResponseMock).toHaveBeenCalledWith(
      expect.any(Request),
      ['Join.html'],
      expect.objectContaining({
        repIdOverride: 'rep-1',
        canonicalPathOverride: '/milehighfizz/join',
        publicSiteSlugOverride: 'milehighfizz',
        joinVisibilityVerified: true,
      }),
    )
  })

  it('returns not found when the rep hides Join', async () => {
    getSiteSettingsDashboardMock.mockResolvedValue({
      joinTeamAccessEnabled: true,
      showJoinPage: false,
    })

    const response = await GET(
      new Request('https://www.yoursparklesuite.com/goforthebling/join'),
      { params: Promise.resolve({ publicSiteSlug: 'goforthebling' }) },
    )

    expect(response.status).toBe(404)
    expect(renderAmethystPublicAssetResponseMock).not.toHaveBeenCalled()
  })
})
