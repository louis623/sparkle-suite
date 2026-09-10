import { operatorCustomerSearch } from '@/lib/services/operator-customer-search'
import type { SupabaseClient } from '@supabase/supabase-js'

type JsonObject = Record<string, unknown>
export type RepAccountClassification = 'customer' | 'demo'

export interface ClientAccountSnapshot {
  profileId: string
  repId: string
  clientName: string
  showName: string
  primaryContactName: string | null
  email: string
  phone: string | null
  accountStatus: string | null
  subscriptionStatus: string | null
  supportTier: string | null
  publicSiteSlug: string | null
  customDomain: string | null
  sourceSnapshot: JsonObject
}

export interface OperatorCustomerProfile {
  repId: string
  accountClassification: RepAccountClassification
  clientName: string
  showName: string
  primaryContactName: string | null
  email: string
  phone: string | null
  referral: {
    code: string | null
    usageCount: number
  }
  accountStatus: string | null
  subscriptionStatus: string | null
  supportTier: string | null
  publicSiteSlug: string | null
  customDomain: string | null
  shopLink: string | null
  streamingLinks: JsonObject
  socialHandles: JsonObject
  liveQueueSyncCode: string | null
  internalNotes: string | null
  setupStatus: string | null
  setupCurrentStep: string | null
  billing: {
    status: string | null
    planTier: string | null
    pricingTier: string | null
    monthlyAmount: number | null
    currentPeriodEnd: string | null
    stripeCustomerId: string | null
  }
  createdAt: string | null
  updatedAt: string | null
}

interface RepProfileSource {
  id: string
  account_classification: string | null
  display_name: string | null
  business_name: string | null
  email: string | null
  phone: string | null
  status: string | null
  referral_code: string | null
  public_site_slug: string | null
  custom_domain: string | null
}

interface OperatorRepRow extends RepProfileSource {
  shop_link: string | null
  streaming_links: unknown
  social_handles: unknown
  created_at: string | null
  updated_at: string | null
}

interface OperatorReferralRow {
  referrer_rep_id: string
  referral_code_used: string | null
}

interface ClientAccountProfileRow {
  id: string
  rep_id: string
  client_name: string
  show_name: string | null
  primary_contact_name: string | null
  email: string
  phone: string | null
  account_status: string | null
  subscription_status: string | null
  support_tier: string | null
  public_site_slug: string | null
  custom_domain: string | null
}

interface OperatorClientAccountProfileRow extends ClientAccountProfileRow {
  internal_notes: string | null
  updated_at: string | null
}

interface OperatorSubscriptionRow {
  rep_id: string
  status: string | null
  plan_tier: string | null
  pricing_tier: string | null
  monthly_amount: unknown
  current_period_end: string | null
  stripe_customer_id: string | null
  updated_at: string | null
}

interface OperatorSetupSessionRow {
  rep_id: string
  status: string | null
  current_step: string | null
  dashboard_unlocked_at: string | null
  updated_at: string | null
}

interface OperatorLiveQueueRow {
  rep_id: string
  sync_code: string | null
  created_at: string | null
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function objectOrEmpty(value: unknown): JsonObject {
  return isObject(value) ? value : {}
}

function textOrNull(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function numberOrNull(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function latestTimestamp(...values: Array<string | null | undefined>) {
  const valid = values.filter((value): value is string => Boolean(value))
  if (valid.length === 0) return null
  return valid.sort((left, right) => {
    const leftTime = new Date(left).getTime()
    const rightTime = new Date(right).getTime()
    return rightTime - leftTime
  })[0]
}

function accountBasicsFromSetup(setup: unknown) {
  const setupObject = objectOrEmpty(setup)
  const answers = objectOrEmpty(setupObject.answers)
  return objectOrEmpty(answers.account_basics)
}

function normalizeProfile(row: ClientAccountProfileRow, sourceSnapshot: JsonObject): ClientAccountSnapshot {
  return {
    profileId: row.id,
    repId: row.rep_id,
    clientName: row.client_name,
    showName: row.show_name ?? row.client_name,
    primaryContactName: row.primary_contact_name,
    email: row.email,
    phone: row.phone,
    accountStatus: row.account_status,
    subscriptionStatus: row.subscription_status,
    supportTier: row.support_tier,
    publicSiteSlug: row.public_site_slug,
    customDomain: row.custom_domain,
    sourceSnapshot,
  }
}

export async function ensureClientAccountProfile(
  supabase: SupabaseClient,
  repId: string,
): Promise<ClientAccountSnapshot> {
  const normalizedRepId = repId.trim()
  if (!normalizedRepId) throw new Error('repId is required')

  const { data: rep, error: repError } = await supabase
    .from('reps')
    .select(
      'id, display_name, business_name, email, phone, status, referral_code, public_site_slug, custom_domain',
    )
    .eq('id', normalizedRepId)
    .single()

  if (repError || !rep) {
    throw repError ?? new Error(`Rep ${normalizedRepId} was not found`)
  }

  const { data: setup, error: setupError } = await supabase
    .from('self_serve_setup_sessions')
    .select(
      'status, current_step, completed_steps, answers, generated_copy, support_state, dashboard_unlocked_at, updated_at',
    )
    .eq('rep_id', normalizedRepId)
    .maybeSingle()

  if (setupError) throw setupError

  const { data: subscription, error: subscriptionError } = await supabase
    .from('subscriptions')
    .select('status, plan_tier, pricing_tier, updated_at')
    .eq('rep_id', normalizedRepId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (subscriptionError) throw subscriptionError

  const repSource = rep as RepProfileSource
  const setupSource = setup ? objectOrEmpty(setup) : {}
  const subscriptionSource = subscription ? objectOrEmpty(subscription) : null
  const accountBasics = accountBasicsFromSetup(setupSource)
  const clientName =
    textOrNull(accountBasics.customerFacingDisplayName) ??
    textOrNull(repSource.business_name) ??
    textOrNull(repSource.display_name) ??
    repSource.email ??
    normalizedRepId
  const showName =
    textOrNull(accountBasics.liveShowName) ??
    textOrNull(accountBasics.businessName) ??
    clientName
  const email =
    textOrNull(accountBasics.bestContactEmail) ??
    textOrNull(repSource.email) ??
    `${normalizedRepId}@missing-email.local`
  const sourceSnapshot = {
    rep: repSource,
    setup: setupSource,
    subscription: subscriptionSource,
  }

  const upsertPayload = {
    rep_id: normalizedRepId,
    client_name: clientName,
    show_name: showName,
    primary_contact_name: textOrNull(repSource.display_name),
    email,
    phone: textOrNull(repSource.phone),
    account_status: textOrNull(repSource.status),
    subscription_status: textOrNull(subscriptionSource?.status),
    support_tier:
      textOrNull(subscriptionSource?.pricing_tier) ??
      textOrNull(subscriptionSource?.plan_tier) ??
      'standard',
    public_site_slug:
      textOrNull(accountBasics.publicSiteSlug) ??
      textOrNull(repSource.public_site_slug),
    custom_domain: textOrNull(repSource.custom_domain),
    setup_state: setupSource,
    source_snapshot: sourceSnapshot,
    updated_at: new Date().toISOString(),
  }

  const { data: profile, error: profileError } = await supabase
    .from('client_account_profiles')
    .upsert(upsertPayload, { onConflict: 'rep_id' })
    .select(
      'id, rep_id, client_name, show_name, primary_contact_name, email, phone, account_status, subscription_status, support_tier, public_site_slug, custom_domain',
    )
    .single()

  if (profileError || !profile) {
    throw profileError ?? new Error('client account profile upsert failed')
  }

  return normalizeProfile(profile as ClientAccountProfileRow, sourceSnapshot)
}

async function readAllProfileRelations<T>(query: { range: (start: number, end: number) => PromiseLike<{ data: T[] | null; error: unknown }> }): Promise<{data:T[];error:unknown}> {
  const rows:T[]=[]
  for(let offset=0;offset<100000;offset+=500) {
    const page=await query.range(offset,offset+499)
    if(page.error) return {data:[],error:page.error}
    rows.push(...(page.data??[]))
    if((page.data??[]).length<500) return {data:rows,error:null}
  }
  throw new Error('Customer relationship history exceeds the bounded read limit; refine the customer page.')
}

export async function listOperatorCustomerProfiles(
  supabase: SupabaseClient,
  options: { limit?: number; offset?: number; repIds?: string[]; query?: string; classification?: RepAccountClassification } = {},
): Promise<OperatorCustomerProfile[]> {
  const limit = Math.min(Math.max(options.limit ?? 200, 1), 500)

  const search = operatorCustomerSearch(options.query)

  let repQuery = supabase
        .from('reps')
        .select(
          'id, account_classification, display_name, business_name, email, phone, status, referral_code, public_site_slug, custom_domain, shop_link, streaming_links, social_handles, created_at, updated_at' + (search ? ',' + search.select : ''),
        )
        .order('business_name', { ascending: true })
        .order('id', { ascending: true })
  if (options.repIds) repQuery = repQuery.in('id', options.repIds)
  if(options.classification)repQuery=repQuery.eq('account_classification',options.classification)
  if (search) {
    repQuery = repQuery.or(search.profileFilter, { referencedTable: 'search_profile' }).or(search.repFilter)
  }
  const offset = Math.max(0, options.offset ?? 0)
  const repsResult = await repQuery.range(offset, offset + limit - 1).returns<OperatorRepRow[]>()
  if (repsResult.error) throw repsResult.error
  const pageRepIds = (repsResult.data ?? []).map((rep) => rep.id as string)
  if (!pageRepIds.length) return []
  const [subscriptionsResult, profilesResult, setupSessionsResult, liveQueueResult] = await Promise.all([
      readAllProfileRelations(supabase
        .from('subscriptions')
        .select(
          'rep_id, status, plan_tier, pricing_tier, monthly_amount, current_period_end, stripe_customer_id, updated_at',
        )
        .order('updated_at', { ascending: false })
        .order('id').in('rep_id', pageRepIds)),
      readAllProfileRelations(supabase
        .from('client_account_profiles')
        .select(
          'id, rep_id, client_name, show_name, primary_contact_name, email, phone, account_status, subscription_status, support_tier, public_site_slug, custom_domain, internal_notes, updated_at',
        )
        .order('updated_at', { ascending: false })
        .order('id').in('rep_id', pageRepIds)),
      readAllProfileRelations(supabase
        .from('self_serve_setup_sessions')
        .select(
          'rep_id, status, current_step, dashboard_unlocked_at, updated_at',
        )
        .order('updated_at', { ascending: false })
        .order('id').in('rep_id', pageRepIds)),
      readAllProfileRelations(supabase
        .from('live_queue')
        .select('rep_id, sync_code, created_at')
        .order('created_at', { ascending: true })
        .order('id').in('rep_id', pageRepIds)),
    ])

  if (subscriptionsResult.error) throw subscriptionsResult.error
  if (profilesResult.error) throw profilesResult.error
  if (setupSessionsResult.error) throw setupSessionsResult.error
  if (liveQueueResult.error) throw liveQueueResult.error

  const repRows = (repsResult.data ?? []) as OperatorRepRow[]
  const repIds = repRows.map((rep) => rep.id)
  const referralRowsResult =
    repIds.length > 0
      ? await readAllProfileRelations(supabase
          .from('rep_referrals')
          .select('referrer_rep_id, referral_code_used')
          .in('referrer_rep_id', repIds)
          .order('id'))
      : { data: [], error: null }

  if (referralRowsResult.error) throw referralRowsResult.error

  const subscriptionsByRep = new Map<string, OperatorSubscriptionRow>()
  for (const row of (subscriptionsResult.data ?? []) as OperatorSubscriptionRow[]) {
    if (!subscriptionsByRep.has(row.rep_id)) subscriptionsByRep.set(row.rep_id, row)
  }

  const profilesByRep = new Map<string, OperatorClientAccountProfileRow>()
  for (const row of (profilesResult.data ?? []) as OperatorClientAccountProfileRow[]) {
    if (!profilesByRep.has(row.rep_id)) profilesByRep.set(row.rep_id, row)
  }

  const setupByRep = new Map<string, OperatorSetupSessionRow>()
  for (const row of (setupSessionsResult.data ?? []) as OperatorSetupSessionRow[]) {
    if (!setupByRep.has(row.rep_id)) setupByRep.set(row.rep_id, row)
  }

  const liveQueueByRep = new Map<string, OperatorLiveQueueRow>()
  for (const row of (liveQueueResult.data ?? []) as OperatorLiveQueueRow[]) {
    if (!liveQueueByRep.has(row.rep_id)) liveQueueByRep.set(row.rep_id, row)
  }

  const referralUsageByRep = new Map<string, number>()
  for (const row of (referralRowsResult.data ?? []) as OperatorReferralRow[]) {
    const current = referralUsageByRep.get(row.referrer_rep_id) ?? 0
    referralUsageByRep.set(row.referrer_rep_id, current + 1)
  }

  return repRows.map((rep) => {
    const profile = profilesByRep.get(rep.id)
    const subscription = subscriptionsByRep.get(rep.id)
    const setup = setupByRep.get(rep.id)
    const liveQueue = liveQueueByRep.get(rep.id)
    const fallbackName =
      textOrNull(rep.business_name) ??
      textOrNull(rep.display_name) ??
      textOrNull(rep.email) ??
      rep.id
    const fallbackEmail =
      textOrNull(rep.email) ?? `${rep.id}@missing-email.local`

    return {
      repId: rep.id,
      accountClassification:
        textOrNull(rep.account_classification) === 'customer'
          ? 'customer'
          : 'demo',
      clientName:
        textOrNull(profile?.client_name) ??
        fallbackName,
      showName:
        textOrNull(profile?.show_name) ??
        fallbackName,
      primaryContactName:
        textOrNull(profile?.primary_contact_name) ??
        textOrNull(rep.display_name),
      email: textOrNull(profile?.email) ?? fallbackEmail,
      phone: textOrNull(profile?.phone) ?? textOrNull(rep.phone),
      referral: {
        code: textOrNull(rep.referral_code),
        usageCount: referralUsageByRep.get(rep.id) ?? 0,
      },
      accountStatus: textOrNull(profile?.account_status) ?? textOrNull(rep.status),
      subscriptionStatus:
        textOrNull(profile?.subscription_status) ??
        textOrNull(subscription?.status),
      supportTier:
        textOrNull(profile?.support_tier) ??
        textOrNull(subscription?.pricing_tier) ??
        textOrNull(subscription?.plan_tier),
      publicSiteSlug:
        textOrNull(profile?.public_site_slug) ??
        textOrNull(rep.public_site_slug),
      customDomain:
        textOrNull(profile?.custom_domain) ?? textOrNull(rep.custom_domain),
      shopLink: textOrNull(rep.shop_link),
      streamingLinks: objectOrEmpty(rep.streaming_links),
      socialHandles: objectOrEmpty(rep.social_handles),
      liveQueueSyncCode: textOrNull(liveQueue?.sync_code),
      internalNotes: textOrNull(profile?.internal_notes),
      setupStatus: textOrNull(setup?.status),
      setupCurrentStep: textOrNull(setup?.current_step),
      billing: {
        status: textOrNull(subscription?.status),
        planTier: textOrNull(subscription?.plan_tier),
        pricingTier: textOrNull(subscription?.pricing_tier),
        monthlyAmount: numberOrNull(subscription?.monthly_amount),
        currentPeriodEnd: textOrNull(subscription?.current_period_end),
        stripeCustomerId: textOrNull(subscription?.stripe_customer_id),
      },
      createdAt: textOrNull(rep.created_at),
      updatedAt: latestTimestamp(
        profile?.updated_at,
        subscription?.updated_at,
        setup?.updated_at,
        rep.updated_at,
      ),
    }
  })
}
