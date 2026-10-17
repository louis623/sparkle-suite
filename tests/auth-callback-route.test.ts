import { beforeEach, describe, expect, it, vi } from 'vitest'

const createServerClientMock = vi.fn()
const createAdminClientMock = vi.fn()
const cookiesMock = vi.fn()
const exchangeCodeForSessionMock = vi.fn()
const getUserMock = vi.fn()
const signOutMock = vi.fn()

vi.mock('@supabase/ssr', () => ({
  createServerClient: (...args: unknown[]) => createServerClientMock(...args),
}))

vi.mock('next/headers', () => ({
  cookies: (...args: unknown[]) => cookiesMock(...args),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: (...args: unknown[]) => createAdminClientMock(...args),
}))

import { GET } from '@/app/api/auth/callback/route'

function createCookieStore() {
  return {
    getAll: vi.fn(() => [{ name: 'sb-test', value: 'cookie-value' }]),
    set: vi.fn(),
  }
}

function createAdminMock(existingRep?: { id: string; status?: string } | null) {
  const normalizedExistingRep =
    existingRep === null
      ? null
      : {
          ...(existingRep ?? { id: 'rep-google' }),
          status: existingRep?.status ?? 'active',
        }
  const repsMaybeSingle = vi
    .fn()
    .mockResolvedValue({ data: normalizedExistingRep, error: null })
  const repsSingle = vi.fn().mockResolvedValue({
    data: {
      id: 'rep-google',
      auth_user_id: 'auth-google',
      account_classification: 'customer',
      email: 'google@example.com',
    },
    error: null,
  })
  const repsSelect = vi.fn(() => ({
    eq: vi.fn(() => ({
      maybeSingle: repsMaybeSingle,
    })),
    single: repsSingle,
  }))
  const repsInsert = vi.fn(() => ({
    select: repsSelect,
  }))

  const siteSettingsUpsert = vi.fn().mockResolvedValue({ error: null })
  const setupSessionUpsert = vi.fn().mockResolvedValue({ error: null })
  const smsWalletUpsert = vi.fn().mockResolvedValue({ error: null })

  const from = vi.fn((table: string) => {
    if (table === 'reps') {
      return {
        select: repsSelect,
        insert: repsInsert,
      }
    }
    if (table === 'site_settings') return { upsert: siteSettingsUpsert }
    if (table === 'self_serve_setup_sessions') {
      return { upsert: setupSessionUpsert }
    }
    if (table === 'sms_wallet') return { upsert: smsWalletUpsert }
    throw new Error(`unexpected table ${table}`)
  })

  return {
    from,
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    repsInsert,
    repsMaybeSingle,
    repsSingle,
    siteSettingsUpsert,
    setupSessionUpsert,
    smsWalletUpsert,
  }
}

describe('GET /api/auth/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.example'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
    process.env.SPARKLE_SELF_SERVE_ENABLED = 'true'
    exchangeCodeForSessionMock.mockResolvedValue({ data: {}, error: null })
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: 'auth-google',
          email: 'google@example.com',
          user_metadata: {
            full_name: 'Google Rep',
          },
        },
      },
      error: null,
    })
    signOutMock.mockResolvedValue({ error: null })
    createServerClientMock.mockReturnValue({
      auth: {
        exchangeCodeForSession: exchangeCodeForSessionMock,
        getUser: getUserMock,
        signOut: signOutMock,
      },
    })
    createAdminClientMock.mockReturnValue(createAdminMock({ id: 'rep-google' }))
    cookiesMock.mockResolvedValue(createCookieStore())
  })

  it('redirects to login when the OAuth code is missing', async () => {
    const response = await GET(
      new Request('https://sparkle.example/api/auth/callback?next=/nic-nac'),
    )

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'https://sparkle.example/login?error=missing_oauth_code',
    )
    expect(createServerClientMock).not.toHaveBeenCalled()
  })

  it('exchanges the OAuth code and redirects to the requested next path', async () => {
    const response = await GET(
      new Request(
        'https://sparkle.example/api/auth/callback?code=oauth-code&next=/nic-nac?onboarding=checkout-required',
      ),
    )

    expect(createServerClientMock).toHaveBeenCalledWith(
      'https://supabase.example',
      'anon-key',
      expect.objectContaining({
        cookies: expect.objectContaining({
          getAll: expect.any(Function),
          setAll: expect.any(Function),
        }),
      }),
    )
    expect(exchangeCodeForSessionMock).toHaveBeenCalledWith('oauth-code')
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'https://sparkle.example/nic-nac?onboarding=checkout-required',
    )
  })

  it('redirects to login when the OAuth exchange fails', async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      data: {},
      error: { message: 'bad code' },
    })

    const response = await GET(
      new Request('https://sparkle.example/api/auth/callback?code=bad-code'),
    )

    expect(exchangeCodeForSessionMock).toHaveBeenCalledWith('bad-code')
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'https://sparkle.example/login?error=oauth_exchange_failed',
    )
  })

  it('does not start a workspace trial during password recovery', async () => {
    const admin = createAdminMock({ id: 'rep-google' })
    createAdminClientMock.mockReturnValue(admin)

    const response = await GET(
      new Request(
        'https://sparkle.example/api/auth/callback?code=recovery-code&next=/reset-password',
      ),
    )

    expect(admin.rpc).not.toHaveBeenCalled()
    expect(response.headers.get('location')).toBe(
      'https://sparkle.example/reset-password',
    )
  })

  it('defaults to Nic-Nac when next is omitted', async () => {
    const response = await GET(
      new Request('https://sparkle.example/api/auth/callback?code=oauth-code'),
    )

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'https://sparkle.example/nic-nac',
    )
  })

  it('defaults to Nic-Nac when next is an absolute external URL', async () => {
    const response = await GET(
      new Request(
        'http://localhost/api/auth/callback?code=oauth-code&next=https%3A%2F%2Fevil.example%2Fpath',
      ),
    )

    expect(exchangeCodeForSessionMock).toHaveBeenCalledWith('oauth-code')
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost/nic-nac')
  })

  it('defaults to Nic-Nac when next is a protocol-relative external URL', async () => {
    const response = await GET(
      new Request(
        'http://localhost/api/auth/callback?code=oauth-code&next=%2F%2Fevil.example%2Fpath',
      ),
    )

    expect(exchangeCodeForSessionMock).toHaveBeenCalledWith('oauth-code')
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost/nic-nac')
  })

  it('does not provision a missing rep from the regular login callback', async () => {
    const admin = createAdminMock(null)
    createAdminClientMock.mockReturnValue(admin)

    const response = await GET(
      new Request('http://localhost/api/auth/callback?code=oauth-code'),
    )

    expect(admin.repsInsert).not.toHaveBeenCalled()
    expect(admin.siteSettingsUpsert).not.toHaveBeenCalled()
    expect(admin.setupSessionUpsert).not.toHaveBeenCalled()
    expect(admin.smsWalletUpsert).not.toHaveBeenCalled()
    expect(response.headers.get('location')).toBe(
      'http://localhost/login?error=account_not_found',
    )
    expect(signOutMock).toHaveBeenCalledWith({ scope: 'local' })
  })

  it('rejects an old incomplete rep row as an unprovisioned email', async () => {
    const admin = createAdminMock({
      id: 'rep-orphaned',
      status: 'onboarding',
    })
    createAdminClientMock.mockReturnValue(admin)

    const response = await GET(
      new Request('http://localhost/api/auth/callback?code=oauth-code'),
    )

    expect(admin.rpc).not.toHaveBeenCalled()
    expect(signOutMock).toHaveBeenCalledWith({ scope: 'local' })
    expect(response.headers.get('location')).toBe(
      'http://localhost/login?error=account_not_found',
    )
  })

  it('provisions default workspace rows for an explicit Google signup without an existing rep', async () => {
    const admin = createAdminMock(null)
    createAdminClientMock.mockReturnValue(admin)

    const response = await GET(
      new Request(
        'http://localhost/api/auth/callback?code=oauth-code&signup=self-serve&ref=SS-K7M4Q9&next=/nic-nac?onboarding=checkout-required',
      ),
    )

    expect(getUserMock).toHaveBeenCalled()
    expect(admin.repsInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        auth_user_id: 'auth-google',
        account_classification: 'customer',
        email: 'google@example.com',
        display_name: 'Google Rep',
        business_name: 'Google Rep',
        phone: null,
        custom_domain: null,
        public_site_slug: null,
        shop_link: null,
        streaming_links: {
          primary: null,
          secondary: null,
        },
        social_handles: {},
        template_id: 'default',
        status: 'onboarding',
        referral_code: expect.stringMatching(/^SS-[A-HJ-NP-Z2-9]{6}$/),
        finder_directory_visible: true,
      }),
    )
    expect(admin.siteSettingsUpsert).toHaveBeenCalledWith(
      {
        rep_id: 'rep-google',
        banner_text: 'Welcome to Google Rep',
        banner_visible: true,
        ticker_text: null,
        ticker_visible: false,
        tagline: 'A polished place to shop Google Rep.',
        team_name: 'Google Rep',
        show_join_page: true,
        hero_animation_type: 'sparkle_rise',
        customer_site_template: 'amethyst',
        appearance_preset: 'sparkle_suite_morganite',
      },
      { onConflict: 'rep_id' },
    )
    expect(admin.setupSessionUpsert).toHaveBeenCalledWith(
      {
        rep_id: 'rep-google',
        status: 'checkout_required',
        current_step: 'account_basics',
        completed_steps: ['self_serve_account_created'],
        answers: {
          displayName: 'Google Rep',
          email: 'google@example.com',
          referralCode: 'SS-K7M4Q9',
        },
      },
      { onConflict: 'rep_id' },
    )
    expect(admin.smsWalletUpsert).toHaveBeenCalledWith(
      {
        rep_id: 'rep-google',
        balance_mils: 0,
        auto_recharge_enabled: false,
        auto_recharge_threshold_mils: 5000,
        auto_recharge_amount_mils: 25000,
        minimum_load_amount_mils: 25000,
      },
      { onConflict: 'rep_id' },
    )
    expect(response.headers.get('location')).toBe(
      'http://localhost/nic-nac?onboarding=checkout-required',
    )
  })

  it('does not recreate workspace rows for a Google user with an existing rep', async () => {
    const admin = createAdminMock({ id: 'rep-existing' })
    createAdminClientMock.mockReturnValue(admin)

    const response = await GET(
      new Request('http://localhost/api/auth/callback?code=oauth-code'),
    )

    expect(admin.repsInsert).not.toHaveBeenCalled()
    expect(admin.siteSettingsUpsert).not.toHaveBeenCalled()
    expect(admin.setupSessionUpsert).not.toHaveBeenCalled()
    expect(admin.smsWalletUpsert).not.toHaveBeenCalled()
    expect(response.headers.get('location')).toBe('http://localhost/nic-nac')
  })

  it('does not provision a missing rep when self-serve is closed', async () => {
    process.env.SPARKLE_SELF_SERVE_ENABLED = 'false'
    const admin = createAdminMock(null)
    createAdminClientMock.mockReturnValue(admin)

    const response = await GET(
      new Request(
        'http://localhost/api/auth/callback?code=oauth-code&signup=self-serve',
      ),
    )

    expect(admin.repsInsert).not.toHaveBeenCalled()
    expect(admin.siteSettingsUpsert).not.toHaveBeenCalled()
    expect(admin.setupSessionUpsert).not.toHaveBeenCalled()
    expect(admin.smsWalletUpsert).not.toHaveBeenCalled()
    expect(response.headers.get('location')).toBe(
      'http://localhost/login?error=self_serve_not_open',
    )
  })

  it('lets an existing rep continue when self-serve is closed', async () => {
    process.env.SPARKLE_SELF_SERVE_ENABLED = 'false'
    const admin = createAdminMock({ id: 'rep-existing' })
    createAdminClientMock.mockReturnValue(admin)

    const response = await GET(
      new Request(
        'http://localhost/api/auth/callback?code=oauth-code&next=/nic-nac?section=account',
      ),
    )

    expect(admin.repsInsert).not.toHaveBeenCalled()
    expect(response.headers.get('location')).toBe(
      'http://localhost/nic-nac?section=account',
    )
  })
})
