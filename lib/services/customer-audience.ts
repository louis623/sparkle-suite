import type { SupabaseClient } from '@supabase/supabase-js'

import { errors } from './errors'
import type {
  CustomerAudienceChannel,
  CustomerAudienceChangeContext,
  CustomerAudienceContactCreateInput,
  CustomerAudienceContactUpdateInput,
  CustomerAudienceImportInput,
  CustomerAudienceImportResult,
  CustomerAudienceMember,
  CustomerAudienceProfileInput,
  CustomerAudienceResult,
  CustomerAudienceSignupInput,
  CustomerAudienceSignupResult,
  CustomerAudienceUnsubscribeInput,
  CustomerAudienceUnsubscribeResult,
  GetCustomerAudienceFilters,
} from './types'
import { formatBirthday, normalizeBirthday } from './birthdays'

function normalizeText(value: string | undefined) {
  const trimmed = value?.trim() ?? ''
  return trimmed.length > 0 ? trimmed : null
}

function normalizeEmail(value: string | undefined) {
  const normalized = normalizeText(value)
  return normalized ? normalized.toLowerCase() : null
}

function normalizePhoneDigits(value: string | undefined) {
  const digits = (value ?? '').replace(/\D/g, '')
  if (!digits) return null
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.slice(1)
  }
  return digits
}

type CustomerAudienceRow = {
  id: string
  name: string
  rep_id?: string
  phone: string | null
  email: string | null
  address: string | null
  birthday_month: number | null
  birthday_day: number | null
  favorite_gem_or_stone: string | null
  favorite_material: string | null
  favorite_cut: string | null
  favorite_collection: string | null
  notes: string | null
  tags: string[] | null
  sms_consent: boolean | null
  email_consent: boolean | null
  marketing_consent: boolean | null
  consent_date: string | null
  sms_opted_out_at: string | null
  email_opted_out_at: string | null
  stop_keyword_received_at: string | null
  created_at: string
}

const CUSTOMER_AUDIENCE_SELECT_COLUMNS = [
  'id',
  'rep_id',
  'name',
  'phone',
  'email',
  'address',
  'birthday_month',
  'birthday_day',
  'favorite_gem_or_stone',
  'favorite_material',
  'favorite_cut',
  'favorite_collection',
  'notes',
  'tags',
  'sms_consent',
  'email_consent',
  'marketing_consent',
  'consent_date',
  'sms_opted_out_at',
  'email_opted_out_at',
  'stop_keyword_received_at',
  'created_at',
] as const

function normalizeTags(values: string[] | undefined) {
  if (!values) return []
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function getProfileValues(input: CustomerAudienceProfileInput) {
  const name = normalizeText(input.name)
  if (!name) {
    throw errors.INVALID_INPUT('name required', 'Customer name is required.')
  }

  const birthday = normalizeBirthday(input.birthday)
  return {
    name,
    phone: normalizeText(input.phone ?? undefined),
    email: normalizeEmail(input.email ?? undefined),
    address: normalizeText(input.address ?? undefined),
    birthday_month: birthday?.month ?? null,
    birthday_day: birthday?.day ?? null,
    favorite_gem_or_stone: normalizeText(input.favoriteGemOrStone ?? undefined),
    favorite_material: normalizeText(input.favoriteMaterial ?? undefined),
    favorite_cut: normalizeText(input.favoriteCut ?? undefined),
    favorite_collection: normalizeText(input.favoriteCollection ?? undefined),
    notes: normalizeText(input.notes ?? undefined),
    tags: normalizeTags(input.tags),
  }
}

function getProfileUpdateValues(input: CustomerAudienceContactUpdateInput) {
  const values: Record<string, unknown> = {}

  if ('name' in input) {
    const name = normalizeText(input.name ?? undefined)
    if (!name) {
      throw errors.INVALID_INPUT('name cannot be blank', 'Customer name cannot be blank.')
    }
    values.name = name
  }
  if ('phone' in input) values.phone = normalizeText(input.phone ?? undefined)
  if ('email' in input) values.email = normalizeEmail(input.email ?? undefined)
  if ('address' in input) values.address = normalizeText(input.address ?? undefined)
  if ('birthday' in input) {
    const birthday = normalizeBirthday(input.birthday)
    values.birthday_month = birthday?.month ?? null
    values.birthday_day = birthday?.day ?? null
  }
  if ('favoriteGemOrStone' in input) {
    values.favorite_gem_or_stone = normalizeText(input.favoriteGemOrStone ?? undefined)
  }
  if ('favoriteMaterial' in input) {
    values.favorite_material = normalizeText(input.favoriteMaterial ?? undefined)
  }
  if ('favoriteCut' in input) {
    values.favorite_cut = normalizeText(input.favoriteCut ?? undefined)
  }
  if ('favoriteCollection' in input) {
    values.favorite_collection = normalizeText(input.favoriteCollection ?? undefined)
  }
  if ('notes' in input) values.notes = normalizeText(input.notes ?? undefined)
  if ('tags' in input) values.tags = normalizeTags(input.tags)

  if (Object.keys(values).length === 0) {
    throw errors.INVALID_INPUT(
      'profile update required',
      'Include at least one customer detail to update.',
    )
  }

  return values
}

async function appendCustomerAudienceChange(
  supabase: SupabaseClient,
  input: {
    audienceId: string
    repId: string
    action: 'created' | 'profile_updated'
    changes: Record<string, unknown>
    context: CustomerAudienceChangeContext
  },
) {
  const { error } = await supabase.from('customer_audience_change_log').insert({
    audience_id: input.audienceId,
    rep_id: input.repId,
    actor_kind: input.context.actorKind,
    actor_rep_id: input.context.actorRepId ?? null,
    nic_nac_conversation_id: input.context.nicNacConversationId ?? null,
    nic_nac_run_id: input.context.nicNacRunId ?? null,
    action: input.action,
    changes: input.changes,
  })

  if (error) throw error
}

function clampLimit(value: number | undefined) {
  if (!value || Number.isNaN(value)) return 25
  return Math.max(1, Math.min(100, Math.trunc(value)))
}

function csvCell(value: string | null | undefined) {
  const text = value ?? ''
  // Customer-supplied text must never become a spreadsheet formula when a
  // rep opens their own export in Excel or another spreadsheet app.
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text
  return `"${safeText.replace(/"/g, '""')}"`
}

function csvBoolean(value: boolean) {
  return value ? 'Yes' : 'No'
}

/**
 * Returns a portable, rep-owned customer-list export. This intentionally
 * includes profile fields and consent history instead of confining the list
 * to an application-only view.
 */
export function formatCustomerAudienceCsv(customers: CustomerAudienceMember[]) {
  const headers = [
    'Name',
    'Email',
    'Phone',
    'Address',
    'Birthday',
    'Favorite Gem or Stone',
    'Favorite Material',
    'Favorite Cut',
    'Favorite Collection',
    'Notes',
    'Tags',
    'SMS Consent',
    'Email Consent',
    'Marketing Consent',
    'SMS Reachable',
    'Email Reachable',
    'Consent Date',
    'SMS Opted Out At',
    'Email Opted Out At',
    'STOP Received At',
    'Added At',
  ]

  const rows = customers.map((customer) => [
    customer.name,
    customer.email,
    customer.phone,
    customer.address,
    customer.birthday,
    customer.favoriteGemOrStone,
    customer.favoriteMaterial,
    customer.favoriteCut,
    customer.favoriteCollection,
    customer.notes,
    customer.tags?.join(', ') ?? '',
    csvBoolean(customer.smsConsent),
    csvBoolean(customer.emailConsent),
    csvBoolean(customer.marketingConsent),
    csvBoolean(customer.canReceiveSms),
    csvBoolean(customer.canReceiveEmail),
    customer.consentDate,
    customer.smsOptedOutAt,
    customer.emailOptedOutAt,
    customer.stopKeywordReceivedAt,
    customer.createdAt,
  ])

  return [headers, ...rows]
    .map((row) => row.map((value) => csvCell(String(value ?? ''))).join(','))
    .join('\r\n')
}

function mapAudienceRow(row: CustomerAudienceRow): CustomerAudienceMember {
  const smsConsent = Boolean(row.sms_consent)
  const emailConsent = Boolean(row.email_consent)
  const marketingConsent = Boolean(row.marketing_consent)
  const smsOptedOutAt = row.sms_opted_out_at
  const stopKeywordReceivedAt = row.stop_keyword_received_at
  const emailOptedOutAt = row.email_opted_out_at
  const smsBlocked = Boolean(smsOptedOutAt || stopKeywordReceivedAt)
  const emailBlocked = Boolean(emailOptedOutAt)
  const hasProfileColumns =
    row.address !== undefined ||
    row.birthday_month !== undefined ||
    row.birthday_day !== undefined ||
    row.favorite_gem_or_stone !== undefined ||
    row.favorite_material !== undefined ||
    row.favorite_cut !== undefined ||
    row.favorite_collection !== undefined ||
    row.notes !== undefined ||
    row.tags !== undefined

  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    ...(hasProfileColumns
      ? {
          address: row.address ?? null,
          birthday: formatBirthday(row.birthday_month, row.birthday_day),
          favoriteGemOrStone: row.favorite_gem_or_stone ?? null,
          favoriteMaterial: row.favorite_material ?? null,
          favoriteCut: row.favorite_cut ?? null,
          favoriteCollection: row.favorite_collection ?? null,
          notes: row.notes ?? null,
          tags: row.tags ?? [],
        }
      : {}),
    smsConsent,
    emailConsent,
    marketingConsent,
    canReceiveSms: smsConsent && Boolean(row.phone) && !smsBlocked,
    canReceiveEmail: emailConsent && Boolean(row.email) && !emailBlocked,
    consentDate: row.consent_date,
    createdAt: row.created_at,
    smsOptedOutAt,
    emailOptedOutAt,
    stopKeywordReceivedAt,
  }
}

function matchesChannel(
  customer: CustomerAudienceMember,
  channelFilter: CustomerAudienceChannel,
) {
  if (channelFilter === 'sms') return customer.canReceiveSms
  if (channelFilter === 'email') return customer.canReceiveEmail
  if (channelFilter === 'marketing') return customer.marketingConsent
  return true
}

function summarizeAudience(customers: CustomerAudienceMember[]) {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  return {
    totalCustomers: customers.length,
    smsReachableCount: customers.filter((customer) => customer.canReceiveSms).length,
    emailReachableCount: customers.filter((customer) => customer.canReceiveEmail)
      .length,
    marketingConsentCount: customers.filter((customer) => customer.marketingConsent)
      .length,
    smsOptedOutCount: customers.filter(
      (customer) =>
        customer.smsOptedOutAt !== null ||
        customer.stopKeywordReceivedAt !== null,
    ).length,
    emailOptedOutCount: customers.filter(
      (customer) => customer.emailOptedOutAt !== null,
    ).length,
    addedLast30DaysCount: customers.filter(
      (customer) => new Date(customer.createdAt) >= thirtyDaysAgo,
    ).length,
  }
}

function createEmptyUnsubscribeResult(): CustomerAudienceUnsubscribeResult {
  return {
    updatedCount: 0,
    smsUpdatedCount: 0,
    emailUpdatedCount: 0,
  }
}

async function listCustomerAudienceRows(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('customer_audience')
    .select(CUSTOMER_AUDIENCE_SELECT_COLUMNS.join(', '))
    .not('id', 'is', null)

  if (error) throw error
  return (data ?? []) as unknown as CustomerAudienceRow[]
}

async function listCustomerAudienceRowsForRep(
  supabase: SupabaseClient,
  repId: string,
) {
  const pageSize = 1000
  const rows: CustomerAudienceRow[] = []

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from('customer_audience')
      .select(CUSTOMER_AUDIENCE_SELECT_COLUMNS.join(', '))
      .eq('rep_id', repId)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (error) throw error

    const page = (data ?? []) as unknown as CustomerAudienceRow[]
    rows.push(...page)
    if (page.length < pageSize) return rows
  }
}

async function getCustomerAudienceRowForRep(
  supabase: SupabaseClient,
  repId: string,
  audienceId: string,
) {
  const { data, error } = await supabase
    .from('customer_audience')
    .select(CUSTOMER_AUDIENCE_SELECT_COLUMNS.join(', '))
    .eq('id', audienceId)
    .eq('rep_id', repId)
    .maybeSingle()

  if (error) throw error
  return (data ?? null) as unknown as CustomerAudienceRow | null
}

export async function createCustomerAudienceSignup(
  supabase: SupabaseClient,
  repId: string,
  input: CustomerAudienceSignupInput,
): Promise<CustomerAudienceSignupResult> {
  if (!repId) {
    throw errors.UNAUTHORIZED('repId required')
  }

  const firstName = normalizeText(input.firstName)
  const lastName = normalizeText(input.lastName)
  const email = normalizeText(input.email)
  const phone = normalizeText(input.phone)

  if (!firstName) {
    throw errors.INVALID_INPUT('firstName required', 'First name is required.')
  }

  if (!lastName) {
    throw errors.INVALID_INPUT('lastName required', 'Last name is required.')
  }

  if (!input.smsConsent && !input.emailConsent) {
    throw errors.INVALID_INPUT(
      'at least one contact channel is required',
      'Choose SMS, email, or both before signing up.',
    )
  }

  if (input.smsConsent && !phone) {
    throw errors.INVALID_INPUT(
      'phone required when sms_consent is true',
      'A phone number is required if the customer wants SMS updates.',
    )
  }

  if (input.emailConsent && !email) {
    throw errors.INVALID_INPUT(
      'email required when email_consent is true',
      'An email address is required if the customer wants email updates.',
    )
  }

  const profile = getProfileValues({
    name: `${firstName} ${lastName}`,
    email,
    phone,
    address: input.address,
    birthday: input.birthday,
    favoriteGemOrStone: input.favoriteGemOrStone,
    favoriteMaterial: input.favoriteMaterial,
    favoriteCut: input.favoriteCut,
    favoriteCollection: input.favoriteCollection,
    notes: input.notes,
    tags: input.tags,
  })

  const { data, error } = await supabase
    .from('customer_audience')
    .insert({
      rep_id: repId,
      record_source: 'customer_site_signup',
      ...profile,
      sms_consent: input.smsConsent,
      email_consent: input.emailConsent,
      marketing_consent: input.marketingConsent,
      consent_date: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) throw error

  await appendCustomerAudienceChange(supabase, {
    audienceId: data.id as string,
    repId,
    action: 'created',
    changes: profile,
    context: { actorKind: 'customer' },
  })

  return {
    audienceId: data.id as string,
  }
}

/**
 * Creates a rep-owned contact without granting any messaging consent. This is
 * the only supported path for a rep or Nic-Nac to add a manual contact.
 */
export async function createCustomerAudienceContact(
  supabase: SupabaseClient,
  repId: string,
  input: CustomerAudienceContactCreateInput,
  context: CustomerAudienceChangeContext = { actorKind: 'rep' },
): Promise<CustomerAudienceMember> {
  if (!repId) throw errors.UNAUTHORIZED('repId required')

  const profile = getProfileValues(input)
  const { data, error } = await supabase
    .from('customer_audience')
    .insert({
      rep_id: repId,
      ...profile,
      sms_consent: false,
      email_consent: false,
      marketing_consent: false,
      consent_date: null,
    })
    .select(CUSTOMER_AUDIENCE_SELECT_COLUMNS.join(', '))
    .single()

  if (error) throw error
  const row = data as unknown as CustomerAudienceRow

  await appendCustomerAudienceChange(supabase, {
    audienceId: row.id,
    repId,
    action: 'created',
    changes: profile,
    context,
  })

  return mapAudienceRow(row)
}

/**
 * Updates only editable profile values for a contact owned by `repId`.
 * Consent and opt-out columns are intentionally not accepted or written here.
 */
export async function updateCustomerAudienceContact(
  supabase: SupabaseClient,
  repId: string,
  input: CustomerAudienceContactUpdateInput,
  context: CustomerAudienceChangeContext = { actorKind: 'rep' },
): Promise<CustomerAudienceMember | null> {
  if (!repId) throw errors.UNAUTHORIZED('repId required')
  if (!input.audienceId.trim()) {
    throw errors.INVALID_INPUT(
      'audienceId required',
      'I need the customer record before I can update it.',
    )
  }

  const profile = getProfileUpdateValues(input)
  const { data, error } = await supabase
    .from('customer_audience')
    .update(profile)
    .eq('id', input.audienceId.trim())
    .eq('rep_id', repId)
    .select(CUSTOMER_AUDIENCE_SELECT_COLUMNS.join(', '))
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const row = data as unknown as CustomerAudienceRow
  await appendCustomerAudienceChange(supabase, {
    audienceId: row.id,
    repId,
    action: 'profile_updated',
    changes: profile,
    context,
  })

  return mapAudienceRow(row)
}

/**
 * Imports a rep's existing contact file without manufacturing marketing
 * consent. Rows match only within the rep's own audience by normalized email
 * or phone; a match receives profile-only updates, otherwise a new contact is
 * created. Existing rows are never merged or deleted.
 */
export async function importCustomerAudienceContacts(
  supabase: SupabaseClient,
  repId: string,
  contacts: CustomerAudienceImportInput[],
  context: CustomerAudienceChangeContext = { actorKind: 'rep' },
): Promise<CustomerAudienceImportResult> {
  if (!repId) throw errors.UNAUTHORIZED('repId required')
  if (contacts.length === 0) {
    throw errors.INVALID_INPUT('contacts required', 'Choose a spreadsheet with at least one contact.')
  }
  if (contacts.length > 250) {
    throw errors.INVALID_INPUT('too many contacts', 'Import up to 250 contacts at a time.')
  }

  const existingRows = (await listCustomerAudienceRows(supabase)).filter(
    (row) => row.rep_id === repId,
  )
  const byEmail = new Map<string, CustomerAudienceRow>()
  const byPhone = new Map<string, CustomerAudienceRow>()
  for (const row of existingRows) {
    const email = normalizeEmail(row.email ?? undefined)
    const phone = normalizePhoneDigits(row.phone ?? undefined)
    if (email) byEmail.set(email, row)
    if (phone) byPhone.set(phone, row)
  }

  const result: CustomerAudienceImportResult = {
    createdCount: 0,
    updatedCount: 0,
    skipped: [],
  }

  for (const [index, input] of contacts.entries()) {
    const row = index + 2
    const name = normalizeText(input.name)
    if (!name) {
      result.skipped.push({ row, reason: 'Missing a customer name.' })
      continue
    }

    const email = normalizeEmail(input.email ?? undefined)
    const phone = normalizePhoneDigits(input.phone ?? undefined)
    const emailMatch = email ? byEmail.get(email) : undefined
    const phoneMatch = phone ? byPhone.get(phone) : undefined
    if (emailMatch && phoneMatch && emailMatch.id !== phoneMatch.id) {
      result.skipped.push({
        row,
        reason: 'Email and phone match different existing customers.',
      })
      continue
    }
    const existing = emailMatch ?? phoneMatch

    if (existing) {
      await updateCustomerAudienceContact(
        supabase,
        repId,
        { audienceId: existing.id, ...input },
        context,
      )
      result.updatedCount += 1
      if (email) byEmail.set(email, existing)
      if (phone) byPhone.set(phone, existing)
      continue
    }

    const customer = await createCustomerAudienceContact(
      supabase,
      repId,
      input,
      context,
    )
    result.createdCount += 1
    const createdRow = {
      id: customer.id,
      name: customer.name,
      rep_id: repId,
      phone: customer.phone,
      email: customer.email,
    } as CustomerAudienceRow
    if (email) byEmail.set(email, createdRow)
    if (phone) byPhone.set(phone, createdRow)
  }

  return result
}

export async function unsubscribeCustomerAudienceByPhone(
  supabase: SupabaseClient,
  phone: string,
  options: {
    markStopKeywordReceived?: boolean
  } = {},
): Promise<CustomerAudienceUnsubscribeResult> {
  const normalizedPhone = normalizePhoneDigits(phone)

  if (!normalizedPhone) {
    throw errors.INVALID_INPUT(
      'phone required',
      'A phone number is required to unsubscribe SMS updates.',
    )
  }

  const rows = await listCustomerAudienceRows(supabase)
  const matchedRows = rows.filter(
    (row) => normalizePhoneDigits(row.phone ?? undefined) === normalizedPhone,
  )

  if (matchedRows.length === 0) {
    return createEmptyUnsubscribeResult()
  }

  const timestamp = new Date().toISOString()
  const updateValues: Record<string, string> = {
    sms_opted_out_at: timestamp,
  }

  if (options.markStopKeywordReceived) {
    updateValues.stop_keyword_received_at = timestamp
  }

  const { error } = await supabase
    .from('customer_audience')
    .update(updateValues)
    .in(
      'id',
      matchedRows.map((row) => row.id),
    )

  if (error) throw error

  return {
    updatedCount: matchedRows.length,
    smsUpdatedCount: matchedRows.length,
    emailUpdatedCount: 0,
  }
}

export async function unsubscribeCustomerAudienceByContact(
  supabase: SupabaseClient,
  input: CustomerAudienceUnsubscribeInput,
): Promise<CustomerAudienceUnsubscribeResult> {
  if (!input.repId) {
    throw errors.UNAUTHORIZED('repId required')
  }

  if (!input.unsubscribeSms && !input.unsubscribeEmail) {
    throw errors.INVALID_INPUT(
      'at least one unsubscribe channel is required',
      'Choose SMS, email, or both to unsubscribe.',
    )
  }

  const normalizedPhone = normalizePhoneDigits(input.phone)
  const normalizedEmail = normalizeEmail(input.email)

  if (input.unsubscribeSms && !normalizedPhone) {
    throw errors.INVALID_INPUT(
      'phone required when unsubscribeSms is true',
      'A phone number is required to unsubscribe SMS updates.',
    )
  }

  if (input.unsubscribeEmail && !normalizedEmail) {
    throw errors.INVALID_INPUT(
      'email required when unsubscribeEmail is true',
      'An email address is required to unsubscribe email updates.',
    )
  }

  const rows = await listCustomerAudienceRows(supabase)
  const matchedRows = rows.filter((row) => {
    if (row.rep_id !== input.repId) return false

    const phoneMatches =
      input.unsubscribeSms &&
      normalizedPhone !== null &&
      normalizePhoneDigits(row.phone ?? undefined) === normalizedPhone

    const emailMatches =
      input.unsubscribeEmail &&
      normalizedEmail !== null &&
      normalizeEmail(row.email ?? undefined) === normalizedEmail

    return phoneMatches || emailMatches
  })

  if (matchedRows.length === 0) {
    return createEmptyUnsubscribeResult()
  }

  const timestamp = new Date().toISOString()
  const updateValues: Record<string, string> = {}

  if (input.unsubscribeSms) {
    updateValues.sms_opted_out_at = timestamp
  }

  if (input.unsubscribeEmail) {
    updateValues.email_opted_out_at = timestamp
  }

  const { error } = await supabase
    .from('customer_audience')
    .update(updateValues)
    .in(
      'id',
      matchedRows.map((row) => row.id),
    )

  if (error) throw error

  return {
    updatedCount: matchedRows.length,
    smsUpdatedCount: input.unsubscribeSms ? matchedRows.length : 0,
    emailUpdatedCount: input.unsubscribeEmail ? matchedRows.length : 0,
  }
}

export async function unsubscribeCustomerAudienceMember(
  supabase: SupabaseClient,
  repId: string,
  input: {
    audienceId: string
    unsubscribeSms: boolean
    unsubscribeEmail: boolean
  },
): Promise<CustomerAudienceUnsubscribeResult> {
  if (!repId) {
    throw errors.UNAUTHORIZED('repId required')
  }

  if (!input.audienceId) {
    throw errors.INVALID_INPUT(
      'audienceId required',
      'I need the customer record before I can unsubscribe it.',
    )
  }

  if (!input.unsubscribeSms && !input.unsubscribeEmail) {
    throw errors.INVALID_INPUT(
      'at least one unsubscribe channel is required',
      'Choose SMS, email, or both to unsubscribe.',
    )
  }

  const matchedRow = await getCustomerAudienceRowForRep(
    supabase,
    repId,
    input.audienceId,
  )

  if (!matchedRow) {
    return createEmptyUnsubscribeResult()
  }

  const timestamp = new Date().toISOString()
  const updateValues: Record<string, string> = {}

  if (input.unsubscribeSms) {
    updateValues.sms_opted_out_at = timestamp
  }

  if (input.unsubscribeEmail) {
    updateValues.email_opted_out_at = timestamp
  }

  const { error } = await supabase
    .from('customer_audience')
    .update(updateValues)
    .eq('id', matchedRow.id)
    .eq('rep_id', repId)

  if (error) throw error

  return {
    updatedCount: 1,
    smsUpdatedCount: input.unsubscribeSms ? 1 : 0,
    emailUpdatedCount: input.unsubscribeEmail ? 1 : 0,
  }
}

export async function getCustomerAudienceMember(
  supabase: SupabaseClient,
  repId: string,
  audienceId: string,
): Promise<CustomerAudienceMember | null> {
  if (!repId) {
    throw errors.UNAUTHORIZED('repId required')
  }

  if (!audienceId) {
    throw errors.INVALID_INPUT(
      'audienceId required',
      'I need the customer record before I can do that.',
    )
  }

  const matchedRow = await getCustomerAudienceRowForRep(
    supabase,
    repId,
    audienceId,
  )

  return matchedRow ? mapAudienceRow(matchedRow) : null
}

export async function getCustomerAudience(
  supabase: SupabaseClient,
  repId: string,
  filters: GetCustomerAudienceFilters = {},
): Promise<CustomerAudienceResult> {
  if (!repId) {
    throw errors.UNAUTHORIZED('repId required')
  }

  const customers = (await listCustomerAudienceRowsForRep(supabase, repId)).map(
    mapAudienceRow,
  )
  const channelFilter = filters.channelFilter ?? 'all'
  const limit =
    filters.limit === null
      ? Number.POSITIVE_INFINITY
      : clampLimit(filters.limit)

  return {
    summary: summarizeAudience(customers),
    customers: customers
      .filter((customer) => matchesChannel(customer, channelFilter))
      .slice(0, limit),
  }
}


/** No audience scan or contact serialization: one bounded tenant query owns uniqueness. */
export async function matchLineupAudience(db: SupabaseClient, repId: string, entries: import('../live-lineup/types').WorkspaceLineupEntry[], signal?: AbortSignal) {
  if (!repId || entries.length > 2000) throw errors.INVALID_INPUT('invalid match scope')
  // Database case folding is authoritative; receipts echo each requested raw full name.
  const key = (text: string) => text
  const eligible = entries.filter(entry => entry.identityEligible === true && !!entry.lastName?.trim() && !!entry.sourceIdentityVersion)
  const names = [...new Set(eligible.map(entry => key(entry.name + ' ' + entry.lastName)))]
  const query = db.rpc('live_lineup_match_audience', {p_rep_id: repId, p_names: names})
  const { data, error } = await (signal ? query.abortSignal(signal) : query)
  if (error || !data || typeof data.version !== 'string' || !/^\d{1,19}$/.test(data.version)
    || !Array.isArray(data.matches) || data.matches.length !== names.length) throw errors.INVALID_INPUT('audience match unavailable')
  type Row = {key: string; count: number; month: number | null; day: number | null; gem: string | null; material: string | null; cut: string | null; collection: string | null}
  const byName = new Map<string, Row>()
  for (const row of data.matches as Row[]) {
    if (!row || !names.includes(row.key) || byName.has(row.key) || !Number.isSafeInteger(row.count) || row.count < 0) throw errors.INVALID_INPUT('invalid audience match receipt')
    byName.set(row.key, row)
  }
  const harmlessText = (value: unknown) => typeof value === 'string'
    ? Array.from(value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/gu, ' ').trim()).slice(0, 80).join('') : ''
  const matches: import('../live-lineup/audience').LineupAudienceMatch[] = []
  for (const entry of eligible) {
    const row = byName.get(key(entry.name + ' ' + entry.lastName))
    if (!row || row.count !== 1) continue
    const birthday = Number.isInteger(row.month) && Number.isInteger(row.day) && row.month! >= 1 && row.month! <= 12
      && row.day! >= 1 && row.day! <= new Date(Date.UTC(2000,row.month!,0)).getUTCDate() ? row.month + '/' + row.day : null
    const preferences = [row.gem,row.material,row.cut,row.collection].map(harmlessText).filter(Boolean)
    if (birthday || preferences.length) matches.push({id:entry.id,sourceIdentityVersion:entry.sourceIdentityVersion!,birthday,preferences})
  }
  return {audienceVersion: data.version as string, matches}
}
