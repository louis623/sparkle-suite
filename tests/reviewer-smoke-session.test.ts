import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ensureLiveQueueSyncCodeForRepMock = vi.hoisted(() => vi.fn())
const createWorkspaceMock = vi.hoisted(() => vi.fn())
vi.mock('@/lib/self-serve/signup', () => ({ createSelfServeWorkspaceForAuthUser: (...args: unknown[]) => createWorkspaceMock(...args) }))

vi.mock('@/lib/services/live-queue', () => ({
  ensureLiveQueueSyncCodeForRep: (...args: unknown[]) =>
    ensureLiveQueueSyncCodeForRepMock(...args),
}))

import { resetReviewerSmokeSession, reviewerSmokeCalendarIds } from '@/lib/reviewer-smoke/session'
import { REVIEWER_SMOKE_SCOPE } from '@/lib/reviewer-smoke/identity'

function makeDeleteBuilder() {
  const builder = {eq:vi.fn(),in:vi.fn(),or:vi.fn(),match:vi.fn(),delete:vi.fn(),then:(resolve: (value:unknown)=>unknown)=>Promise.resolve({error:null}).then(resolve)}
  for (const method of ['eq','in','or','match','delete'] as const) builder[method].mockReturnValue(builder)
  return builder
}

function makeReviewerAdmin() {
  const repSelectMaybeSingle = vi.fn().mockResolvedValue({
    data: {
      id: 'rep-reviewer',
      auth_user_id: 'auth-reviewer',
      email: 'sparkle-reviewer+preview@neonrabbit.net',
      account_classification: 'demo', finder_directory_visible: false, custom_domain: null, public_site_slug: null,
    },
    error: null,
  })
  const repSelectEq = vi.fn(() => ({ maybeSingle: repSelectMaybeSingle }))
  const repSelect = vi.fn(() => ({ eq: repSelectEq }))
  const repUpdateSingle = vi.fn().mockResolvedValue({ data: {id:'rep-reviewer'}, error: null })
  const repUpdateBuilder = {eq: vi.fn(),select:vi.fn(),single:repUpdateSingle}
  repUpdateBuilder.eq.mockReturnValue(repUpdateBuilder);repUpdateBuilder.select.mockReturnValue(repUpdateBuilder)
  const repUpdate = vi.fn(() => repUpdateBuilder)
  const setupUpsert = vi.fn().mockResolvedValue({ error: null })
  const subscriptionRead = vi.fn().mockResolvedValue({ data:null,error:null })
  const subscriptionWriteSingle = vi.fn().mockResolvedValue({data:{rep_id:'rep-reviewer'},error:null})
  const subscriptionWriteBuilder = {eq:vi.fn(),select:vi.fn(),single:subscriptionWriteSingle}
  subscriptionWriteBuilder.eq.mockReturnValue(subscriptionWriteBuilder);subscriptionWriteBuilder.select.mockReturnValue(subscriptionWriteBuilder)
  const subscriptionUpsert = vi.fn(()=>subscriptionWriteBuilder)
  const teamManagementEntitlementUpsert = vi.fn().mockResolvedValue({ error: null })
  const teamRead = vi.fn().mockResolvedValue({data:null,error:null})
  const listingRead = vi.fn().mockResolvedValue({data:{id:'00000000-0000-4000-8000-000000000102',rep_id:'rep-reviewer',design_id:'00000000-0000-4000-8000-000000000101'},error:null})
  const requestRead = vi.fn().mockResolvedValue({data:{id:'00000000-0000-4000-8000-000000000103',listing_id:'00000000-0000-4000-8000-000000000102'},error:null})
  const readBuilder = (read: typeof listingRead) => {const b={eq:vi.fn(),maybeSingle:read};b.eq.mockReturnValue(b);return b}
  const designDelete = makeDeleteBuilder()
  const listingDelete = makeDeleteBuilder()
  const requestDelete = makeDeleteBuilder()
  const fulfillmentDelete = makeDeleteBuilder()
  const swapDelete = makeDeleteBuilder()
  const conversationDelete = makeDeleteBuilder()
  const workspaceConversationDelete = makeDeleteBuilder()
  const onboardingParticipantDelete = makeDeleteBuilder()
  const joinTeamMemberDelete = makeDeleteBuilder()
  const approvalDelete = makeDeleteBuilder()
  const runDelete = makeDeleteBuilder()
  const reminderPreferenceDelete = makeDeleteBuilder()
  const reminderOverrideDelete = makeDeleteBuilder()
  const audienceDelete = makeDeleteBuilder()
  const eventDelete = makeDeleteBuilder()
  const audienceUpsert = vi.fn().mockResolvedValue({ error: null })
  const eventUpsert = vi.fn().mockResolvedValue({ error: null })
  const updateUserById = vi.fn().mockResolvedValue({ error: null })
  const getUserById = vi.fn().mockResolvedValue({data:{user:{id:'auth-reviewer',email:'sparkle-reviewer+preview@neonrabbit.net',app_metadata:{reviewer_smoke_scope:REVIEWER_SMOKE_SCOPE}}},error:null})
  const listUsers = vi.fn().mockResolvedValue({data:{users:[]},error:null})
  const createUser = vi.fn().mockResolvedValue({data:{user:{id:'auth-reviewer'}},error:null})
  const rpc = vi.fn().mockResolvedValue({data:[{rep_id:'rep-reviewer',auth_user_id:'auth-reviewer',ready:false,reset_at:'2026-09-09T12:00:00.000Z',deleted_states:0,deleted_tokens:0,deleted_archives:0}],error:null})

  const admin = {
    auth: {
      admin: {
        updateUserById,
        getUserById,listUsers,createUser,
      },
    },
    rpc,
    from: vi.fn((table: string) => {
      if (table === 'reps') {
        return {
          select: repSelect,
          update: repUpdate,
        }
      }
      if (table === 'self_serve_setup_sessions') {
        return { upsert: setupUpsert }
      }
      if (table === 'subscriptions') {
        return { select:()=>({eq:()=>({maybeSingle:subscriptionRead})}),insert:subscriptionUpsert,update:subscriptionUpsert }
      }
      if (table === 'team_management_entitlements') {
        return { insert: teamManagementEntitlementUpsert,select:()=>readBuilder(teamRead) }
      }
      if (table === 'jewelry_designs') return designDelete
      if (table === 'trade_listings') return {...listingDelete,select:()=>readBuilder(listingRead)}
      if (table === 'trade_requests') return {...requestDelete,select:()=>readBuilder(requestRead)}
      if (table === 'trade_fulfillment') return fulfillmentDelete
      if (table === 'trade_swaps') return swapDelete
      if (table === 'nic_nac_conversations') return conversationDelete
      if (table === 'workspace_conversations') return workspaceConversationDelete
      if (table === 'team_onboarding_participants') return onboardingParticipantDelete
      if (table === 'join_team_members') return joinTeamMemberDelete
      if (table === 'approval_events') return approvalDelete
      if (table === 'nic_nac_runs') return runDelete
      if (table === 'show_reminder_preferences') return reminderPreferenceDelete
      if (table === 'show_reminder_overrides') return reminderOverrideDelete
      if (table === 'customer_audience') {
        return { ...audienceDelete, insert: audienceUpsert }
      }
      if (table === 'calendar_events') {
        return { ...eventDelete, insert: eventUpsert }
      }
      throw new Error(`Unexpected table ${table}`)
    }),
  }

  return {
    admin,
    spies: {
      approvalDelete,
      conversationDelete,
      workspaceConversationDelete,
      onboardingParticipantDelete,
      joinTeamMemberDelete,
      runDelete,
      setupUpsert,
      subscriptionUpsert,
      teamManagementEntitlementUpsert,
      designDelete,
      listingDelete,
      requestDelete,
      fulfillmentDelete,
      swapDelete,
      reminderPreferenceDelete,
      reminderOverrideDelete,
      audienceDelete,
      eventDelete,
      audienceUpsert,
      eventUpsert,
      repUpdate,
      repSelectMaybeSingle,repUpdateSingle,subscriptionRead,subscriptionWriteBuilder,subscriptionWriteSingle,
      updateUserById,getUserById,listUsers,createUser,rpc,
      listingRead,requestRead,teamRead,
    },
  }
}

describe('reviewer smoke session reset', () => {
  afterEach(()=>vi.unstubAllEnvs())
  beforeEach(() => {
    vi.stubEnv('SPARKLE_REVIEWER_SMOKE_EMAIL','sparkle-reviewer+preview@neonrabbit.net')
    createWorkspaceMock.mockReset();createWorkspaceMock.mockResolvedValue({repId:'rep-reviewer'})
    ensureLiveQueueSyncCodeForRepMock.mockReset()
    ensureLiveQueueSyncCodeForRepMock.mockResolvedValue({
      syncCode: 'BTR-7342',
      created: false,
    })
  })

  it('fails closed for old user-metadata-only reviewers without resetting passwords or data',async()=>{
    const {admin,spies}=makeReviewerAdmin()
    spies.getUserById.mockResolvedValue({data:{user:{id:'auth-reviewer',email:'sparkle-reviewer+preview@neonrabbit.net',app_metadata:{}}},error:null})
    await expect(resetReviewerSmokeSession('required_setup',admin as never)).rejects.toMatchObject({code:'REVIEWER_SMOKE_IDENTITY_MIGRATION_REQUIRED'})
    expect(spies.updateUserById).not.toHaveBeenCalled();expect(spies.rpc).not.toHaveBeenCalled();expect(spies.subscriptionUpsert).not.toHaveBeenCalled()
  })
  it('provisions required setup with zero-dollar non-live access and a not-ready reset receipt',async()=>{
    const {admin,spies}=makeReviewerAdmin()
    await resetReviewerSmokeSession('required_setup',admin as never)
    expect(spies.subscriptionUpsert).toHaveBeenCalledWith(expect.objectContaining({status:'active',monthly_amount:0,stripe_livemode:false}))
    expect(spies.setupUpsert).toHaveBeenCalledWith(expect.objectContaining({support_state:expect.objectContaining({reviewer_smoke:expect.objectContaining({live_lineup:expect.objectContaining({ready:false,state:'not_initialized'})})})}),expect.anything())
    expect(spies.rpc.mock.invocationCallOrder[0]).toBeLessThan(spies.conversationDelete.delete.mock.invocationCallOrder[0])
  })
  it('creates a new synthetic reviewer with server-owned scope and required-setup entitlement',async()=>{
    const {admin,spies}=makeReviewerAdmin()
    spies.repSelectMaybeSingle.mockResolvedValue({data:null,error:null} as never)
    await resetReviewerSmokeSession('required_setup',admin as never)
    expect(spies.createUser).toHaveBeenCalledWith(expect.objectContaining({email:'sparkle-reviewer+preview@neonrabbit.net',app_metadata:{reviewer_smoke_scope:REVIEWER_SMOKE_SCOPE}}))
    expect(createWorkspaceMock).toHaveBeenCalledWith(expect.objectContaining({accountClassification:'demo',finderDirectoryVisible:false}),admin)
    expect(spies.subscriptionUpsert).toHaveBeenCalledWith(expect.objectContaining({status:'active',monthly_amount:0,stripe_livemode:false}))
    expect(spies.updateUserById).not.toHaveBeenCalled()
  })
  it('does not overwrite customer/provider subscriptions',async()=>{
    const {admin,spies}=makeReviewerAdmin()
    spies.subscriptionRead.mockResolvedValue({data:{rep_id:'rep-reviewer',stripe_livemode:true},error:null} as never)
    await expect(resetReviewerSmokeSession('required_setup',admin as never)).rejects.toMatchObject({code:'REVIEWER_SMOKE_UNSAFE_ENTITLEMENT'})
    expect(spies.subscriptionUpsert).not.toHaveBeenCalled();expect(spies.rpc).not.toHaveBeenCalled()
  })
  it('does not overwrite a provider-backed Team Management entitlement',async()=>{
    const {admin,spies}=makeReviewerAdmin()
    spies.teamRead.mockResolvedValue({data:{rep_id:'rep-reviewer',stripe_subscription_id:'sub_real'},error:null} as never)
    await expect(resetReviewerSmokeSession('dashboard_unlocked',admin as never)).rejects.toMatchObject({code:'REVIEWER_SMOKE_UNSAFE_ENTITLEMENT'})
    expect(spies.teamManagementEntitlementUpsert).not.toHaveBeenCalled();expect(spies.updateUserById).not.toHaveBeenCalled()
  })
  it('leaves unowned fixed-ID legacy fixtures intact',async()=>{
    const {admin,spies}=makeReviewerAdmin();spies.listingRead.mockResolvedValue({data:null,error:null} as never)
    await resetReviewerSmokeSession('required_setup',admin as never)
    for(const b of [spies.swapDelete,spies.fulfillmentDelete,spies.requestDelete,spies.listingDelete,spies.designDelete]) expect(b.delete).not.toHaveBeenCalled()
  })
  it('does not continue cleanup or rotate a password after invalid reset acknowledgment',async()=>{
    const {admin,spies}=makeReviewerAdmin();spies.rpc.mockResolvedValue({data:[],error:null})
    await expect(resetReviewerSmokeSession('required_setup',admin as never)).rejects.toMatchObject({code:'REVIEWER_SMOKE_INVALID_RESET_RECEIPT'})
    expect(spies.conversationDelete.delete).not.toHaveBeenCalled();expect(spies.updateUserById).not.toHaveBeenCalled()
  })
  it('can reset a reviewer again after its reserved synthetic site was assigned',async()=>{
    const {admin,spies}=makeReviewerAdmin()
    spies.repSelectMaybeSingle.mockResolvedValue({data:{id:'rep-reviewer',auth_user_id:'auth-reviewer',email:'sparkle-reviewer+preview@neonrabbit.net',account_classification:'demo',finder_directory_visible:false,custom_domain:null,public_site_slug:'sparkle-reviewer-preview'},error:null})
    await resetReviewerSmokeSession('required_setup',admin as never)
    expect(spies.repUpdate).toHaveBeenCalledWith(expect.objectContaining({public_site_slug:'sparkle-reviewer-preview'}))
  })

  it('clears the reusable reviewer rep Nic-Nac history so setup preview starts fresh', async () => {
    const { admin, spies } = makeReviewerAdmin()

    const result = await resetReviewerSmokeSession(
      'required_setup',
      admin as never,
    )

    expect(result.next).toBe('/nic-nac?onboarding=required-setup')
    expect(spies.approvalDelete.delete).toHaveBeenCalled()
    expect(spies.approvalDelete.eq).toHaveBeenCalledWith('rep_id', 'rep-reviewer')
    expect(spies.runDelete.delete).toHaveBeenCalled()
    expect(spies.runDelete.eq).toHaveBeenCalledWith('rep_id', 'rep-reviewer')
    expect(spies.conversationDelete.delete).toHaveBeenCalled()
    expect(spies.conversationDelete.eq).toHaveBeenCalledWith(
      'rep_id',
      'rep-reviewer',
    )
  })

  it('clears synthetic Team Management data so the Alex smoke is repeatable', async () => {
    const { admin, spies } = makeReviewerAdmin()

    await resetReviewerSmokeSession('dashboard_unlocked', admin as never)

    expect(spies.onboardingParticipantDelete.eq).toHaveBeenCalledWith(
      'owner_rep_id',
      'rep-reviewer',
    )
    expect(spies.joinTeamMemberDelete.eq).toHaveBeenCalledWith(
      'rep_id',
      'rep-reviewer',
    )
    expect(spies.workspaceConversationDelete.match).toHaveBeenCalledWith({
      created_by_rep_id: 'rep-reviewer',
      conversation_type: 'team_onboarding',
    })
    expect(
      spies.workspaceConversationDelete.delete.mock.invocationCallOrder[0],
    ).toBeLessThan(
      spies.onboardingParticipantDelete.delete.mock.invocationCallOrder[0],
    )
  })

  it('ensures reviewer required setup has a real Live Queue sync code', async () => {
    const { admin } = makeReviewerAdmin()

    await resetReviewerSmokeSession('required_setup', admin as never)

    expect(ensureLiveQueueSyncCodeForRepMock).toHaveBeenCalledWith(
      admin,
      { repId: 'rep-reviewer' },
    )
  })

  it('starts required setup preview without stale welcome-copy answers', async () => {
    const { admin, spies } = makeReviewerAdmin()

    await resetReviewerSmokeSession('required_setup', admin as never)

    expect(spies.setupUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        current_step: 'account_basics',
        completed_steps: [],
        generated_copy: {},
        answers: expect.not.objectContaining({
          welcome_copy: expect.objectContaining({
            headline: 'Welcome, sparkle friends.',
          }),
        }),
      }),
      { onConflict: 'rep_id' },
    )
  })

  it('seeds active test subscription access for dashboard-unlocked smoke sessions', async () => {
    const { admin, spies } = makeReviewerAdmin()

    await resetReviewerSmokeSession('dashboard_unlocked', admin as never)

    expect(spies.subscriptionUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        rep_id: 'rep-reviewer',
        status: 'active',
        plan_tier: 'monthly',
        pricing_tier: 'smoke',
        stripe_livemode: false,
        monthly_amount: 0,
      }),
    )
  })

  it('always keeps the synthetic reviewer out of the public Finder directory', async () => {
    const { admin, spies } = makeReviewerAdmin()

    await resetReviewerSmokeSession('dashboard_unlocked', admin as never)

    expect(spies.repUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        account_classification: 'demo',
        status: 'active',
        finder_directory_visible: false,
      }),
    )
  })

  it('seeds Team Management beta access for dashboard workspace smoke sessions', async () => {
    const { admin, spies } = makeReviewerAdmin()

    await resetReviewerSmokeSession('dashboard_unlocked', admin as never)

    expect(spies.teamManagementEntitlementUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        rep_id: 'rep-reviewer',
        status: 'manual_beta',
        source: 'manual_beta',
        stripe_subscription_id: null,
        stripe_price_id: null,
        stripe_customer_id: 'cus_reviewer_smoke_rep-reviewer',
      }),
    )
  })

  it('clears only owned legacy fulfillment rows and leaves shared catalog designs', async () => {
    const { admin, spies } = makeReviewerAdmin()

    await resetReviewerSmokeSession('dashboard_unlocked', admin as never)

    expect(spies.swapDelete.delete).toHaveBeenCalled()
    expect(spies.swapDelete.eq).toHaveBeenCalledWith('outgoing_listing_id','00000000-0000-4000-8000-000000000102')
    expect(spies.swapDelete.or).not.toHaveBeenCalled()
    expect(spies.fulfillmentDelete.eq).toHaveBeenCalledWith(
      'id',
      '00000000-0000-4000-8000-000000000104',
    )
    expect(spies.requestDelete.eq).toHaveBeenCalledWith(
      'id',
      '00000000-0000-4000-8000-000000000103',
    )
    expect(spies.listingDelete.eq).toHaveBeenCalledWith(
      'id',
      '00000000-0000-4000-8000-000000000102',
    )
    expect(spies.listingDelete.eq).toHaveBeenCalledWith('rep_id','rep-reviewer')
    expect(spies.designDelete.delete).not.toHaveBeenCalled()
  })

  it('seeds deterministic calendar and audience rows for dashboard Nic-Nac smoke', async () => {
    const { admin, spies } = makeReviewerAdmin()
    const ids=reviewerSmokeCalendarIds('rep-reviewer')

    await resetReviewerSmokeSession('dashboard_unlocked', admin as never)

    expect(spies.reminderOverrideDelete.in).toHaveBeenCalledWith('event_id', [
      '00000000-0000-4000-8000-000000000202',
      '00000000-0000-4000-8000-000000000203',
      ids.tonightEventId, ids.futureEventId,
    ])
    expect(spies.reminderPreferenceDelete.eq).toHaveBeenCalledWith(
      'rep_id',
      'rep-reviewer',
    )
    expect(spies.eventUpsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          id: ids.tonightEventId,
          rep_id: 'rep-reviewer',
          platform: 'TikTok',
          is_recurring: true,
          recurrence_group_id: ids.recurrenceGroupId,
          status: 'scheduled',
          streaming_destinations: [
            { platform: 'tiktok', url: 'https://www.tiktok.com/@sparklesuitereviewer' },
          ],
        }),
        expect.objectContaining({
          id: ids.futureEventId,
          rep_id: 'rep-reviewer',
          is_recurring: true,
          recurrence_group_id: ids.recurrenceGroupId,
          status: 'scheduled',
          streaming_destinations: [
            { platform: 'tiktok', url: 'https://www.tiktok.com/@sparklesuitereviewer' },
            { platform: 'whatnot', url: 'https://www.whatnot.com/user/sparklesuitereviewer' },
          ],
        }),
      ],
    )
    expect(spies.audienceUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: ids.audienceId,
        rep_id: 'rep-reviewer',
        sms_consent: true,
        email_consent: true,
      }),
    )
    for(const b of [spies.eventDelete,spies.audienceDelete,spies.reminderOverrideDelete]) expect(b.eq).toHaveBeenCalledWith('rep_id','rep-reviewer')
    expect(reviewerSmokeCalendarIds('another-reviewer')).not.toEqual(ids)
  })
})
