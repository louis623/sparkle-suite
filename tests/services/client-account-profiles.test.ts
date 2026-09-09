import { describe, expect, it, vi } from 'vitest'
import {
  ensureClientAccountProfile,
  listOperatorCustomerProfiles,
} from '@/lib/services/client-account-profiles'

type TableName =
  | 'reps'
  | 'self_serve_setup_sessions'
  | 'subscriptions'
  | 'client_account_profiles'
  | 'live_queue'
  | 'rep_referrals'

function makeSingleResult(data: unknown, error: unknown = null) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data, error })),
    single: vi.fn(async () => ({ data, error })),
  }
  return query
}

function makeUpsertResult(data: unknown, error: unknown = null) {
  const query = {
    upsert: vi.fn(() => query),
    select: vi.fn(() => query),
    single: vi.fn(async () => ({ data, error })),
  }
  return query
}

function makeListResult(data: unknown[], error: unknown = null) {
  let filtered = data
  const query = {
    select: vi.fn(() => query),
    in: vi.fn((key:string,values:string[]) => { filtered=filtered.filter(row=>values.includes(String((row as Record<string,unknown>)[key]))); return query }),
    order: vi.fn(() => query),
    range: vi.fn(async (start:number,end:number) => ({data:filtered.slice(start,end+1),error})),
    limit: vi.fn(async () => ({ data:filtered, error })),
  }
  return query
}

function makeClient(options: {
  rep: Record<string, unknown>
  setup?: Record<string, unknown> | null
  subscription?: Record<string, unknown> | null
  profile?: Record<string, unknown>
}) {
  const queries = {
    reps: makeSingleResult(options.rep),
    self_serve_setup_sessions: makeSingleResult(options.setup ?? null),
    subscriptions: makeSingleResult(options.subscription ?? null),
    client_account_profiles: makeUpsertResult(
      options.profile ?? {
        id: 'profile-1',
        rep_id: options.rep.id,
        client_name: options.rep.business_name,
        show_name: options.rep.business_name,
        primary_contact_name: options.rep.display_name,
        email: options.rep.email,
        phone: options.rep.phone,
        account_status: options.rep.status,
        subscription_status: options.subscription?.status ?? null,
        support_tier: 'standard',
        public_site_slug: options.rep.public_site_slug,
        custom_domain: options.rep.custom_domain,
        setup_state: options.setup ?? {},
        source_snapshot: {},
      },
    ),
  } satisfies Partial<Record<TableName, unknown>>

  return {
    client: {
      from: vi.fn((table: TableName) => queries[table as keyof typeof queries]),
    },
    queries,
  }
}

function makeListClient(options: {
  reps: Record<string, unknown>[]
  subscriptions: Record<string, unknown>[]
  profiles: Record<string, unknown>[]
  setupSessions: Record<string, unknown>[]
  liveQueue?: Record<string, unknown>[]
  repReferrals?: Record<string, unknown>[]
}) {
  const queries = {
    reps: makeListResult(options.reps),
    subscriptions: makeListResult(options.subscriptions),
    client_account_profiles: makeListResult(options.profiles),
    self_serve_setup_sessions: makeListResult(options.setupSessions),
    live_queue: makeListResult(options.liveQueue ?? []),
    rep_referrals: makeListResult(options.repReferrals ?? []),
  } satisfies Record<TableName, unknown>

  return {
    client: {
      from: vi.fn((table: TableName) => queries[table]),
    },
    queries,
  }
}

describe('ensureClientAccountProfile', () => {
  it('creates a support-facing profile from rep and required setup data', async () => {
    const setup = {
      status: 'dashboard_unlocked',
      current_step: 'final_preview_approval',
      completed_steps: ['account_basics'],
      answers: {
        account_basics: {
          liveShowName: "Gracie's Sparkle Party Live",
          bestContactEmail: 'support-contact@example.com',
          publicSiteSlug: 'graciesparkleparty',
        },
      },
    }
    const { client, queries } = makeClient({
      rep: {
        id: 'rep-1',
        display_name: 'Gracie Roberts',
        business_name: "Gracie's Sparkle Party",
        email: 'gracie@example.com',
        phone: '555-111-2222',
        status: 'active',
        public_site_slug: 'graciesparkleparty',
        custom_domain: 'shop.gracie.example',
      },
      setup,
      subscription: { status: 'active' },
      profile: {
        id: 'profile-1',
        rep_id: 'rep-1',
        client_name: "Gracie's Sparkle Party",
        show_name: "Gracie's Sparkle Party Live",
        primary_contact_name: 'Gracie Roberts',
        email: 'support-contact@example.com',
        phone: '555-111-2222',
        account_status: 'active',
        subscription_status: 'active',
        support_tier: 'standard',
        public_site_slug: 'graciesparkleparty',
        custom_domain: 'shop.gracie.example',
        setup_state: setup,
        source_snapshot: {},
      },
    })

    const profile = await ensureClientAccountProfile(client as never, 'rep-1')

    expect(client.from).toHaveBeenCalledWith('reps')
    expect(client.from).toHaveBeenCalledWith('self_serve_setup_sessions')
    expect(client.from).toHaveBeenCalledWith('subscriptions')
    expect(client.from).toHaveBeenCalledWith('client_account_profiles')
    expect(queries.client_account_profiles.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        rep_id: 'rep-1',
        client_name: "Gracie's Sparkle Party",
        show_name: "Gracie's Sparkle Party Live",
        primary_contact_name: 'Gracie Roberts',
        email: 'support-contact@example.com',
        phone: '555-111-2222',
        account_status: 'active',
        subscription_status: 'active',
        support_tier: 'standard',
        public_site_slug: 'graciesparkleparty',
        custom_domain: 'shop.gracie.example',
        setup_state: setup,
      }),
      { onConflict: 'rep_id' },
    )
    expect(profile).toEqual({
      profileId: 'profile-1',
      repId: 'rep-1',
      clientName: "Gracie's Sparkle Party",
      showName: "Gracie's Sparkle Party Live",
      primaryContactName: 'Gracie Roberts',
      email: 'support-contact@example.com',
      phone: '555-111-2222',
      accountStatus: 'active',
      subscriptionStatus: 'active',
      supportTier: 'standard',
      publicSiteSlug: 'graciesparkleparty',
      customDomain: 'shop.gracie.example',
      sourceSnapshot: expect.objectContaining({
        rep: expect.objectContaining({ id: 'rep-1' }),
        setup,
        subscription: { status: 'active' },
      }),
    })
  })

  it('falls back to rep business name and email when setup fields are missing', async () => {
    const { client, queries } = makeClient({
      rep: {
        id: 'rep-2',
        display_name: 'Sasha Lee',
        business_name: 'Sparkle by Sasha',
        email: 'sasha@example.com',
        phone: null,
        status: 'onboarding',
        public_site_slug: null,
        custom_domain: null,
      },
      setup: null,
      subscription: null,
      profile: {
        id: 'profile-2',
        rep_id: 'rep-2',
        client_name: 'Sparkle by Sasha',
        show_name: 'Sparkle by Sasha',
        primary_contact_name: 'Sasha Lee',
        email: 'sasha@example.com',
        phone: null,
        account_status: 'onboarding',
        subscription_status: null,
        support_tier: 'standard',
        public_site_slug: null,
        custom_domain: null,
        setup_state: {},
        source_snapshot: {},
      },
    })

    const profile = await ensureClientAccountProfile(client as never, 'rep-2')

    expect(queries.client_account_profiles.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        client_name: 'Sparkle by Sasha',
        show_name: 'Sparkle by Sasha',
        email: 'sasha@example.com',
        phone: null,
        subscription_status: null,
        setup_state: {},
      }),
      { onConflict: 'rep_id' },
    )
    expect(profile.showName).toBe('Sparkle by Sasha')
    expect(profile.email).toBe('sasha@example.com')
  })
})

describe('listOperatorCustomerProfiles', () => {
  it('lists reps with merged contact, billing, website, social, and notes data', async () => {
    const { client, queries } = makeListClient({
      reps: [
        {
          id: 'rep-1',
          account_classification: 'customer',
          display_name: 'Jane Roberts',
          business_name: "Jane's Sparkle Party",
          email: 'jane@example.com',
          phone: '555-123-4567',
          status: 'active',
          referral_code: 'SS-JANE12',
          public_site_slug: 'janesparkleparty',
          custom_domain: 'jane.example',
          shop_link: 'https://shop.example/jane',
          streaming_links: { tiktok: 'https://www.tiktok.com/@janesparkle' },
          social_handles: { instagram: '@janesparkle' },
          created_at: '2026-06-01T12:00:00.000Z',
          updated_at: '2026-06-12T12:00:00.000Z',
        },
      ],
      subscriptions: [
        {
          rep_id: 'rep-1',
          status: 'active',
          plan_tier: 'monthly',
          pricing_tier: 'founder',
          monthly_amount: 49,
          current_period_end: '2026-07-12T12:00:00.000Z',
          stripe_customer_id: 'cus_123',
          updated_at: '2026-06-12T12:00:00.000Z',
        },
      ],
      profiles: [
        {
          rep_id: 'rep-1',
          client_name: 'Jane Roberts',
          show_name: "Jane's Sparkle Party Live",
          primary_contact_name: 'Jane Roberts',
          email: 'billing@example.com',
          phone: '555-555-5555',
          account_status: 'active',
          subscription_status: 'active',
          support_tier: 'founder',
          public_site_slug: 'janesparkleparty',
          custom_domain: 'jane.example',
          internal_notes: 'Prefers text for urgent billing questions.',
          updated_at: '2026-06-13T12:00:00.000Z',
        },
      ],
      setupSessions: [
        {
          rep_id: 'rep-1',
          status: 'dashboard_unlocked',
          current_step: 'final_preview_approval',
          dashboard_unlocked_at: '2026-06-12T12:00:00.000Z',
          updated_at: '2026-06-12T12:00:00.000Z',
        },
      ],
      liveQueue: [
        { rep_id: 'rep-1', sync_code: 'JSP-1234', created_at: '2026-06-01T12:00:00.000Z' },
      ],
      repReferrals: [
        {
          referrer_rep_id: 'rep-1',
          referral_code_used: 'SS-JANE12',
        },
        {
          referrer_rep_id: 'rep-1',
          referral_code_used: 'SS-JANE12',
        },
      ],
    })

    const customers = await listOperatorCustomerProfiles(client as never, {
      limit: 200,
    })

    expect(client.from).toHaveBeenCalledWith('reps')
    expect(client.from).toHaveBeenCalledWith('subscriptions')
    expect(client.from).toHaveBeenCalledWith('client_account_profiles')
    expect(client.from).toHaveBeenCalledWith('self_serve_setup_sessions')
    expect(client.from).toHaveBeenCalledWith('live_queue')
    expect(queries.reps.select).toHaveBeenCalledWith(
      'id, account_classification, display_name, business_name, email, phone, status, referral_code, public_site_slug, custom_domain, shop_link, streaming_links, social_handles, created_at, updated_at',
    )
    expect(client.from).toHaveBeenCalledWith('rep_referrals')
    expect(queries.rep_referrals.select).toHaveBeenCalledWith(
      'referrer_rep_id, referral_code_used',
    )
    expect(queries.rep_referrals.in).toHaveBeenCalledWith('referrer_rep_id', [
      'rep-1',
    ])
    expect(customers).toEqual([
      {
        repId: 'rep-1',
        accountClassification: 'customer',
        clientName: 'Jane Roberts',
        showName: "Jane's Sparkle Party Live",
        primaryContactName: 'Jane Roberts',
        email: 'billing@example.com',
        phone: '555-555-5555',
        referral: {
          code: 'SS-JANE12',
          usageCount: 2,
        },
        accountStatus: 'active',
        subscriptionStatus: 'active',
        supportTier: 'founder',
        publicSiteSlug: 'janesparkleparty',
        customDomain: 'jane.example',
        shopLink: 'https://shop.example/jane',
        streamingLinks: { tiktok: 'https://www.tiktok.com/@janesparkle' },
        socialHandles: { instagram: '@janesparkle' },
        liveQueueSyncCode: 'JSP-1234',
        internalNotes: 'Prefers text for urgent billing questions.',
        setupStatus: 'dashboard_unlocked',
        setupCurrentStep: 'final_preview_approval',
        billing: {
          status: 'active',
          planTier: 'monthly',
          pricingTier: 'founder',
          monthlyAmount: 49,
          currentPeriodEnd: '2026-07-12T12:00:00.000Z',
          stripeCustomerId: 'cus_123',
        },
        createdAt: '2026-06-01T12:00:00.000Z',
        updatedAt: '2026-06-13T12:00:00.000Z',
      },
    ])
  })
})


describe('LOC paginated customer reads', () => {
 it('finds later customers and fetches relationships only for that page',async()=>{
  const reps=Array.from({length:502},(_,i)=>({id:'rep-'+i,business_name:'Customer '+i,email:'c'+i+'@example.com',status:'active'}))
  const {client,queries}=makeListClient({reps,subscriptions:[{rep_id:'rep-0',status:'past_due'},{rep_id:'rep-501',status:'active',monthly_amount:49}],profiles:[],setupSessions:[]})
  const result=await listOperatorCustomerProfiles(client as never,{offset:501,limit:1})
  expect(result.map(row=>row.repId)).toEqual(['rep-501'])
  expect(result[0].billing.status).toBe('active')
  expect(queries.subscriptions.in).toHaveBeenCalledWith('rep_id',['rep-501'])
 })
 it('reads relationship history beyond one database page rather than truncating referral totals',async()=>{
  const {client,queries}=makeListClient({reps:[{id:'rep-1',email:'safe@example.com'}],subscriptions:[],profiles:[],setupSessions:[],repReferrals:Array.from({length:1201},()=>({referrer_rep_id:'rep-1'}))})
  const result=await listOperatorCustomerProfiles(client as never,{limit:1})
  expect(result[0].referral.usageCount).toBe(1201)
  expect(queries.rep_referrals.range).toHaveBeenCalledTimes(3)
 })
 it('targets one exact customer independently of its normal list position',async()=>{
  const {client}=makeListClient({reps:[{id:'rep-1'},{id:'rep-2'}],subscriptions:[],profiles:[],setupSessions:[]})
  const result=await listOperatorCustomerProfiles(client as never,{repIds:['rep-2'],limit:1})
  expect(result.map(row=>row.repId)).toEqual(['rep-2'])
 })
})
