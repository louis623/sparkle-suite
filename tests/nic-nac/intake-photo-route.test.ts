import { beforeEach, describe, expect, it, vi } from 'vitest'

const getAuthenticatedNicNacContextMock = vi.fn()
const createAdminClientMock = vi.fn()

vi.mock('@/lib/nic-nac/auth', () => ({
  AuthError: class AuthError extends Error {
    constructor(message?: string) {
      super(message)
      this.name = 'AuthError'
    }
  },
  getAuthenticatedNicNacContext: (...args: unknown[]) =>
    getAuthenticatedNicNacContextMock(...args),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => createAdminClientMock(),
}))

import { GET } from '@/app/api/nic-nac/intake-photos/[photoId]/route'
import { AuthError } from '@/lib/nic-nac/auth'

const PHOTO_ID = '11111111-1111-4111-8111-111111111111'
const STORAGE_HOST = 'https://project.supabase.co'

function adminLookup(result: { data: unknown; error: unknown }) {
  const maybeSingle = vi.fn().mockResolvedValue(result)
  const eq = vi.fn(() => ({ eq, maybeSingle }))
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq })),
    })),
  }
}

function callGet(photoId: string) {
  return GET(new Request(`http://localhost/api/nic-nac/intake-photos/${photoId}`), {
    params: Promise.resolve({ photoId }),
  })
}

describe('intake photo route', () => {
  beforeEach(() => {
    getAuthenticatedNicNacContextMock.mockReset()
    createAdminClientMock.mockReset()
    getAuthenticatedNicNacContextMock.mockResolvedValue({ repId: 'rep-1' })
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', STORAGE_HOST)
  })

  it('returns 404 for a non-uuid id before querying', async () => {
    const response = await callGet('photo-nk60295')
    expect(response.status).toBe(404)
    expect(createAdminClientMock).not.toHaveBeenCalled()
    expect(getAuthenticatedNicNacContextMock).not.toHaveBeenCalled()
  })

  it('returns 404 when the database rejects a non-uuid id', async () => {
    createAdminClientMock.mockReturnValue(
      adminLookup({
        data: null,
        error: { code: '22P02', message: 'invalid input syntax for type uuid' },
      }),
    )
    const response = await callGet(PHOTO_ID)
    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'not_found' })
  })

  it('does not redirect to a host outside the Supabase storage allowlist', async () => {
    createAdminClientMock.mockReturnValue(
      adminLookup({
        data: { image_url: 'https://evil.example/storage/v1/object/public/bucket/photo.jpg' },
        error: null,
      }),
    )
    const response = await callGet(PHOTO_ID)
    expect(response.status).toBe(404)
    expect(response.headers.get('location')).toBeNull()
  })

  it('does not redirect to a non-storage path on the Supabase host', async () => {
    createAdminClientMock.mockReturnValue(
      adminLookup({
        data: { image_url: `${STORAGE_HOST}/rest/v1/trade_board_intake_photos` },
        error: null,
      }),
    )
    const response = await callGet(PHOTO_ID)
    expect(response.status).toBe(404)
    expect(response.headers.get('location')).toBeNull()
  })

  it('redirects only to the Supabase storage host', async () => {
    const target = `${STORAGE_HOST}/storage/v1/object/public/jewelry-photos/rep-1/photo.jpg`
    createAdminClientMock.mockReturnValue(
      adminLookup({
        data: { image_url: target },
        error: null,
      }),
    )
    const response = await callGet(PHOTO_ID)
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(target)
  })

  it('returns stored image bytes for a data url', async () => {
    createAdminClientMock.mockReturnValue(
      adminLookup({
        data: { image_url: 'data:image/png;base64,aGVsbG8=' },
        error: null,
      }),
    )
    const response = await callGet(PHOTO_ID)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/png')
    expect(Buffer.from(await response.arrayBuffer()).toString()).toBe('hello')
  })

  it('returns 401 when the rep is not signed in', async () => {
    getAuthenticatedNicNacContextMock.mockRejectedValueOnce(new AuthError('no session'))
    const response = await callGet(PHOTO_ID)
    expect(response.status).toBe(401)
  })
})
