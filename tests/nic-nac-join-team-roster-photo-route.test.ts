import { beforeEach, describe, expect, it, vi } from 'vitest'

const getPaidNicNacContextMock = vi.fn()
const getTeamOnboardingAccessMock = vi.fn()
const uploadPublicSiteMediaMock = vi.fn()
const analyzeTeamPhotoMock = vi.fn()
vi.mock('@/lib/services/team-photo-analysis', () => ({ analyzeTeamPhoto: (...args: unknown[]) => analyzeTeamPhotoMock(...args) }))

vi.mock('@/lib/nic-nac/auth', () => ({
  AuthError: class AuthError extends Error {},
  getPaidNicNacContext: (...args: unknown[]) =>
    getPaidNicNacContextMock(...args),
}))

vi.mock('@/lib/services/team-onboarding', () => ({
  getTeamOnboardingAccess: (...args: unknown[]) =>
    getTeamOnboardingAccessMock(...args),
}))

vi.mock('@/lib/services/storage', () => ({
  uploadPublicSiteMedia: (...args: unknown[]) =>
    uploadPublicSiteMediaMock(...args),
}))

import { POST } from '@/app/api/nic-nac/join-team-roster/photo/route'
import { AuthError } from '@/lib/nic-nac/auth'

function photoRequest(base64Data: string, filename = 'profile.jpg') {
  return new Request('http://localhost/api/nic-nac/join-team-roster/photo', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ base64Data, filename }),
  })
}

describe('/api/nic-nac/join-team-roster/photo', () => {
  beforeEach(() => {
    getPaidNicNacContextMock.mockReset()
    getTeamOnboardingAccessMock.mockReset()
    uploadPublicSiteMediaMock.mockReset()
    analyzeTeamPhotoMock.mockReset().mockResolvedValue({ framing: { focusX: 50, focusY: 50, zoom: 1, rotation: 0, fit: 'contain' }, quality: { status: 'review', message: 'Check preview' }, width: 800, height: 1000 })
  })

  it('uploads a validated image for a Team Management rep', async () => {
    getPaidNicNacContextMock.mockResolvedValueOnce({
      repId: 'rep-brittany',
      supabase: { marker: 'supabase' },
    })
    getTeamOnboardingAccessMock.mockResolvedValueOnce({
      enabled: true,
      status: 'manual_beta',
      source: 'manual_beta',
    })
    uploadPublicSiteMediaMock.mockResolvedValueOnce(
      'https://cdn.example.com/profile.jpg',
    )

    const response = await POST(
      photoRequest('data:image/jpeg;base64,Zm9v', 'team-member.jpg'),
    )

    expect(getTeamOnboardingAccessMock).toHaveBeenCalledWith(
      { marker: 'supabase' },
      'rep-brittany',
    )
    expect(uploadPublicSiteMediaMock).toHaveBeenCalledWith(
      'rep-brittany',
      'data:image/jpeg;base64,Zm9v',
      { filename: 'team-member.jpg', folder: 'profile' },
    )
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      imageUrl: 'https://cdn.example.com/profile.jpg',
      framing: { focusX: 50, focusY: 50, zoom: 1, rotation: 0, fit: 'contain' },
      quality: { status: 'review', message: 'Check preview' }, width: 800, height: 1000,
    })
  })

  it('rejects unsupported image types before uploading', async () => {
    const response = await POST(photoRequest('data:image/gif;base64,Zm9v'))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'Choose a JPG, PNG, or WebP image.',
    })
    expect(uploadPublicSiteMediaMock).not.toHaveBeenCalled()
  })

  it('rejects corrupt image bytes without publishing or running image edits', async () => {
    getPaidNicNacContextMock.mockResolvedValueOnce({ repId: 'rep-brittany', supabase: {} })
    getTeamOnboardingAccessMock.mockResolvedValueOnce({ enabled: true })
    analyzeTeamPhotoMock.mockRejectedValueOnce(new Error('invalid image'))
    const response = await POST(photoRequest('data:image/jpeg;base64,Zm9v'))
    expect(response.status).toBe(400)
    expect(uploadPublicSiteMediaMock).not.toHaveBeenCalled()
  })

  it('rejects images larger than 3 MB before uploading', async () => {
    const oversizedBase64 = Buffer.alloc(3 * 1024 * 1024 + 1).toString('base64')
    const response = await POST(
      photoRequest(`data:image/png;base64,${oversizedBase64}`, 'large.png'),
    )

    expect(response.status).toBe(413)
    await expect(response.json()).resolves.toEqual({
      error: 'Profile photos must be 3 MB or smaller.',
    })
    expect(uploadPublicSiteMediaMock).not.toHaveBeenCalled()
  })

  it('keeps photo uploads behind Team Management entitlement', async () => {
    getPaidNicNacContextMock.mockResolvedValueOnce({
      repId: 'rep-kim',
      supabase: { marker: 'supabase' },
    })
    getTeamOnboardingAccessMock.mockResolvedValueOnce({
      enabled: false,
      status: 'not_enabled',
      source: null,
    })

    const response = await POST(photoRequest('data:image/webp;base64,Zm9v'))

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({
      code: 'TEAM_MANAGEMENT_ADDON_REQUIRED',
      error: 'Team Management is a paid add-on.',
      access: { enabled: false, status: 'not_enabled', source: null },
    })
    expect(uploadPublicSiteMediaMock).not.toHaveBeenCalled()
  })

  it('returns unauthenticated without uploading', async () => {
    getPaidNicNacContextMock.mockRejectedValueOnce(new AuthError())

    const response = await POST(photoRequest('data:image/jpeg;base64,Zm9v'))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'unauthenticated' })
    expect(uploadPublicSiteMediaMock).not.toHaveBeenCalled()
  })
})
