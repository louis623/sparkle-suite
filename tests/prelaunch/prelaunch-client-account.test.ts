import { describe, expect, it, vi } from 'vitest'

import { preparePrelaunchClientAccountForLaunchBuild } from '@/lib/prelaunch/client-account'

const VALID_PASSWORD = 'RealCustomerTemp2026!'

function makeAdminClient() {
  const fromMock = vi.fn()
  const createUserMock = vi.fn()
  const deleteUserMock = vi.fn()
  const listUsersMock = vi.fn()

  return {
    admin: {
      auth: {
        admin: {
          createUser: createUserMock,
          deleteUser: deleteUserMock,
          listUsers: listUsersMock,
        },
      },
      from: fromMock,
    },
    fromMock,
    createUserMock,
    deleteUserMock,
    listUsersMock,
  }
}

function readySetupBuild(
  overrides: Record<string, unknown> = {},
) {
  return {
    id: 'build-1',
    rep_id: null,
    stage: 'setup_profile',
    status: 'blocked',
    lead_name: 'Louis Sparkle',
    lead_email: 'Louis+Real@NeonRabbit.net',
    setup_profile_status: 'ready',
    payment_gate_status: 'disabled',
    agreement_gate_status: 'disabled',
    build_check_status: 'not_started',
    production_roster_status: 'not_started',
    blockers: [
      'Payment gate is disabled.',
      'Agreement gate is disabled.',
      'Build checks have not started.',
      'Production roster is not connected.',
    ],
    created_at: '2026-08-02T12:00:00.000Z',
    updated_at: '2026-08-02T12:00:00.000Z',
    ...overrides,
  }
}

function setupLaunchBuildLookup(fromMock: ReturnType<typeof vi.fn>, build: object) {
  const single = vi.fn().mockResolvedValueOnce({ data: build, error: null })
  const eq = vi.fn().mockReturnValueOnce({ single })
  const select = vi.fn().mockReturnValueOnce({ eq })
  fromMock.mockReturnValueOnce({ select })
}

function setupProfileLookup(fromMock: ReturnType<typeof vi.fn>) {
  const maybeSingle = vi.fn().mockResolvedValueOnce({
    data: {
      business_name: 'Louis Live Sparkles',
      public_site_goal: 'A real public live shopping hub.',
      custom_domain: 'louis.sparklesuite.test',
      primary_social_url: 'https://tiktok.com/@louis',
      secondary_social_url: 'https://instagram.com/louis',
      shop_url: 'https://example.com/shop',
      brand_notes: 'Bright and simple.',
    },
    error: null,
  })
  const eq = vi.fn().mockReturnValueOnce({ maybeSingle })
  const select = vi.fn().mockReturnValueOnce({ eq })
  fromMock.mockReturnValueOnce({ select })
}

function setupRepLookup(fromMock: ReturnType<typeof vi.fn>) {
  const maybeSingle = vi.fn().mockResolvedValueOnce({ data: null, error: null })
  const eq = vi.fn().mockReturnValueOnce({ maybeSingle })
  const select = vi.fn().mockReturnValueOnce({ eq })
  fromMock.mockReturnValueOnce({ select })
}

describe('prelaunch client account provisioning', () => {
  it('creates an account that stays at checkout until the first payment', async () => {
    const { admin, fromMock, createUserMock, listUsersMock } = makeAdminClient()
    const build = readySetupBuild()
    setupLaunchBuildLookup(fromMock, build)
    setupProfileLookup(fromMock)
    setupRepLookup(fromMock)

    const singleRep = vi.fn().mockResolvedValueOnce({
      data: {
        id: 'rep-1',
        auth_user_id: 'auth-user-1',
        email: 'louis+real@neonrabbit.net',
        display_name: 'Louis Sparkle',
        business_name: 'Louis Live Sparkles',
      },
      error: null,
    })
    const selectRep = vi.fn().mockReturnValueOnce({ single: singleRep })
    const insertRep = vi.fn().mockReturnValueOnce({ select: selectRep })
    fromMock.mockReturnValueOnce({ insert: insertRep })

    const upsertSiteSettings = vi.fn().mockResolvedValueOnce({ error: null })
    const upsertOnboarding = vi.fn().mockResolvedValueOnce({ error: null })
    const upsertSetupSession = vi.fn().mockResolvedValueOnce({ error: null })
    fromMock
      .mockReturnValueOnce({ upsert: upsertSiteSettings })
      .mockReturnValueOnce({ upsert: upsertOnboarding })
      .mockReturnValueOnce({ upsert: upsertSetupSession })

    const linkedBuild = readySetupBuild({
      rep_id: 'rep-1',
      stage: 'checks',
      production_roster_status: 'connected',
      blockers: [
        'Payment gate is disabled.',
        'Agreement gate is disabled.',
        'Build checks have not started.',
      ],
    })
    const singleLink = vi
      .fn()
      .mockResolvedValueOnce({ data: linkedBuild, error: null })
    const selectLink = vi.fn().mockReturnValueOnce({ single: singleLink })
    const isLink = vi.fn().mockReturnValueOnce({ select: selectLink })
    const eqLink = vi.fn().mockReturnValueOnce({ is: isLink })
    const updateLink = vi.fn().mockReturnValueOnce({ eq: eqLink })
    fromMock.mockReturnValueOnce({ update: updateLink })

    listUsersMock.mockResolvedValueOnce({ data: { users: [] }, error: null })
    createUserMock.mockResolvedValueOnce({
      data: { user: { id: 'auth-user-1' } },
      error: null,
    })

    const result = await preparePrelaunchClientAccountForLaunchBuild(
      {
        launchBuildId: 'build-1',
        temporaryPassword: VALID_PASSWORD,
        temporaryPasswordConfirm: VALID_PASSWORD,
        notes: 'Account prepared for coaching.',
        operatorRepId: 'operator-1',
      },
      admin as never,
    )

    expect(createUserMock).toHaveBeenCalledWith({
      email: 'louis+real@neonrabbit.net',
      password: VALID_PASSWORD,
      email_confirm: true,
    })
    expect(insertRep).toHaveBeenCalledWith({
      auth_user_id: 'auth-user-1',
      account_classification: 'customer',
      email: 'louis+real@neonrabbit.net',
      display_name: 'Louis Sparkle',
      business_name: 'Louis Live Sparkles',
      custom_domain: 'louis.sparklesuite.test',
      phone: null,
      shop_link: 'https://example.com/shop',
      streaming_links: {
        primary: 'https://tiktok.com/@louis',
        secondary: 'https://instagram.com/louis',
      },
      social_handles: {},
      template_id: 'default',
      status: 'active',
      finder_directory_visible: true,
    })
    expect(upsertSetupSession).toHaveBeenCalledWith(
      expect.objectContaining({
        rep_id: 'rep-1',
        status: 'checkout_required',
        current_step: 'account_basics',
        completed_steps: ['operator_account_provisioned'],
        dashboard_unlocked_at: null,
      }),
      { onConflict: 'rep_id' },
    )
    expect(fromMock).not.toHaveBeenCalledWith('workspace_trials')
    expect(updateLink).toHaveBeenCalledWith({
      rep_id: 'rep-1',
      production_roster_status: 'connected',
      stage: 'checks',
      status: 'blocked',
      blockers: [
        'Payment gate is disabled.',
        'Agreement gate is disabled.',
        'Build checks have not started.',
      ],
      notes: 'Account prepared for coaching.',
    })
    expect(result).toMatchObject({
      repId: 'rep-1',
      email: 'louis+real@neonrabbit.net',
      createdAuthUser: true,
      sentInvite: false,
      workspaceAccess: 'checkout_required',
      build: {
        id: 'build-1',
        repId: 'rep-1',
        status: 'blocked',
      },
    })
  })

  it('requires setup readiness but does not require payment, agreement, or build gates', async () => {
    const { admin, fromMock, createUserMock } = makeAdminClient()
    setupLaunchBuildLookup(
      fromMock,
      readySetupBuild({ setup_profile_status: 'drafted' }),
    )

    await expect(
      preparePrelaunchClientAccountForLaunchBuild(
        {
          launchBuildId: 'build-1',
          temporaryPassword: VALID_PASSWORD,
          temporaryPasswordConfirm: VALID_PASSWORD,
        },
        admin as never,
      ),
    ).rejects.toThrow(
      'Client account creation requires the setup profile to be ready.',
    )
    expect(createUserMock).not.toHaveBeenCalled()
  })

  it('requires the temporary password to be entered twice and match policy', async () => {
    const { admin, fromMock } = makeAdminClient()

    await expect(
      preparePrelaunchClientAccountForLaunchBuild(
        {
          launchBuildId: 'build-1',
          temporaryPassword: VALID_PASSWORD,
          temporaryPasswordConfirm: 'DifferentTemp2026!',
        },
        admin as never,
      ),
    ).rejects.toThrow('Enter the same new password twice.')
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('checks every auth-user page before creating a duplicate', async () => {
    const { admin, fromMock, createUserMock, listUsersMock } = makeAdminClient()
    setupLaunchBuildLookup(fromMock, readySetupBuild())
    setupProfileLookup(fromMock)
    setupRepLookup(fromMock)
    listUsersMock
      .mockResolvedValueOnce({
        data: {
          users: Array.from({ length: 200 }, (_, index) => ({
            id: `auth-${index}`,
            email: `other-${index}@example.com`,
          })),
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          users: [
            {
              id: 'auth-existing',
              email: 'LOUIS+REAL@NEONRABBIT.NET',
            },
          ],
        },
        error: null,
      })

    await expect(
      preparePrelaunchClientAccountForLaunchBuild(
        {
          launchBuildId: 'build-1',
          temporaryPassword: VALID_PASSWORD,
          temporaryPasswordConfirm: VALID_PASSWORD,
        },
        admin as never,
      ),
    ).rejects.toThrow(
      'An auth user already exists for this email. Use the existing rep account path.',
    )
    expect(listUsersMock).toHaveBeenNthCalledWith(1, {
      page: 1,
      perPage: 200,
    })
    expect(listUsersMock).toHaveBeenNthCalledWith(2, {
      page: 2,
      perPage: 200,
    })
    expect(createUserMock).not.toHaveBeenCalled()
  })

  it('removes the auth user and partial rep data when provisioning fails', async () => {
    const {
      admin,
      fromMock,
      createUserMock,
      deleteUserMock,
      listUsersMock,
    } = makeAdminClient()
    setupLaunchBuildLookup(fromMock, readySetupBuild())
    setupProfileLookup(fromMock)
    setupRepLookup(fromMock)

    const singleRep = vi.fn().mockResolvedValueOnce({
      data: {
        id: 'rep-partial',
        auth_user_id: 'auth-partial',
        email: 'louis+real@neonrabbit.net',
        display_name: 'Louis Sparkle',
        business_name: 'Louis Live Sparkles',
      },
      error: null,
    })
    const selectRep = vi
      .fn()
      .mockReturnValueOnce({ single: singleRep })
    const insertRep = vi.fn().mockReturnValueOnce({ select: selectRep })
    fromMock.mockReturnValueOnce({ insert: insertRep })
    const siteFailure = new Error('site settings failed')
    const upsertSiteSettings = vi
      .fn()
      .mockResolvedValueOnce({ error: siteFailure })
    fromMock.mockReturnValueOnce({ upsert: upsertSiteSettings })

    const restoreEqRep = vi.fn().mockResolvedValueOnce({ error: null })
    const restoreEqBuild = vi.fn().mockReturnValueOnce({ eq: restoreEqRep })
    const restoreUpdate = vi.fn().mockReturnValueOnce({ eq: restoreEqBuild })
    fromMock.mockReturnValueOnce({ update: restoreUpdate })

    const cleanupDeleteMocks: Array<ReturnType<typeof vi.fn>> = []
    for (let index = 0; index < 5; index += 1) {
      const eq = vi.fn().mockResolvedValueOnce({ error: null })
      const deleteMock = vi.fn().mockReturnValueOnce({ eq })
      cleanupDeleteMocks.push(deleteMock)
      fromMock.mockReturnValueOnce({ delete: deleteMock })
    }

    listUsersMock.mockResolvedValueOnce({ data: { users: [] }, error: null })
    createUserMock.mockResolvedValueOnce({
      data: { user: { id: 'auth-partial' } },
      error: null,
    })
    deleteUserMock.mockResolvedValueOnce({ data: null, error: null })

    await expect(
      preparePrelaunchClientAccountForLaunchBuild(
        {
          launchBuildId: 'build-1',
          temporaryPassword: VALID_PASSWORD,
          temporaryPasswordConfirm: VALID_PASSWORD,
        },
        admin as never,
      ),
    ).rejects.toThrow('site settings failed')

    expect(restoreUpdate).toHaveBeenCalledWith({
      rep_id: null,
      production_roster_status: 'not_started',
      stage: 'setup_profile',
      status: 'blocked',
      blockers: readySetupBuild().blockers,
    })
    expect(cleanupDeleteMocks).toHaveLength(5)
    expect(deleteUserMock).toHaveBeenCalledWith('auth-partial')
  })
})
