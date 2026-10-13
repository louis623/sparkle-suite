import { describe, expect, it } from 'vitest'

import {
  createCustomerAudienceContact,
  getCustomerAudience,
  getCustomerAudienceMember,
  importCustomerAudienceContacts,
  unsubscribeCustomerAudienceByPhone,
  unsubscribeCustomerAudienceByContact,
  unsubscribeCustomerAudienceMember,
  updateCustomerAudienceContact,
} from '@/lib/services/customer-audience'

type AudienceRow = {
  id: string
  rep_id: string
  name?: string
  phone: string | null
  email: string | null
  address?: string | null
  birthday_month?: number | null
  birthday_day?: number | null
  favorite_gem_or_stone?: string | null
  favorite_material?: string | null
  favorite_cut?: string | null
  favorite_collection?: string | null
  notes?: string | null
  tags?: string[] | null
  sms_consent?: boolean
  email_consent?: boolean
  marketing_consent?: boolean
  consent_date?: string | null
  sms_opted_out_at?: string | null
  email_opted_out_at?: string | null
  stop_keyword_received_at?: string | null
  created_at?: string
}

function makeSupabase(rows: AudienceRow[]) {
  const updateCalls: Array<{ values: Record<string, unknown>; ids: string[] }> = []
  const selectFilters: Array<[string, unknown]> = []
  const updateFilters: Array<[string, unknown]> = []

  function makeSelectChain() {
    const chain = {
      then(resolve: (value: { data: AudienceRow[]; error: null }) => unknown) {
        return Promise.resolve({ data: rows, error: null }).then(resolve)
      },
      eq(column: string, value: unknown) {
        selectFilters.push([column, value])
        return chain
      },
      not() {
        return chain
      },
      maybeSingle() {
        const idFilter = selectFilters.findLast(([column]) => column === 'id')?.[1]
        const repFilter = selectFilters.findLast(
          ([column]) => column === 'rep_id',
        )?.[1]
        return Promise.resolve({
          data:
            rows.find(
              (row) =>
                (!idFilter || row.id === idFilter) &&
                (!repFilter || row.rep_id === repFilter),
            ) ?? null,
          error: null,
        })
      },
    }

    return chain
  }

  const client = {
    from(table: string) {
      if (table !== 'customer_audience') {
        throw new Error(`Unexpected table ${table}`)
      }

      return {
        select() {
          return makeSelectChain()
        },
        update(values: Record<string, unknown>) {
          const updateChain = {
            then(resolve: (value: { error: null }) => unknown) {
              const idFilter = updateFilters.findLast(
                ([column]) => column === 'id',
              )?.[1]
              updateCalls.push({
                values,
                ids: typeof idFilter === 'string' ? [idFilter] : [],
              })
              return Promise.resolve({ error: null }).then(resolve)
            },
            in(column: string, ids: string[]) {
              if (column !== 'id') {
                throw new Error(`Unexpected update filter ${column}`)
              }
              updateCalls.push({ values, ids })
              return Promise.resolve({ error: null })
            },
            eq(column: string, value: unknown) {
              updateFilters.push([column, value])
              return updateChain
            },
          }

          return updateChain
        },
      }
    },
  }

  return {
    client: client as never,
    updateCalls,
    selectFilters,
    updateFilters,
  }
}

describe('customer audience unsubscribe services', () => {
  it('matches SMS opt-outs by canonical phone digits and marks STOP timestamps', async () => {
    const { client, updateCalls } = makeSupabase([
      {
        id: 'aud-1',
        rep_id: 'rep-1',
        phone: '(555) 555-1212',
        email: 'jamie@example.com',
        sms_consent: true,
      },
      {
        id: 'aud-2',
        rep_id: 'rep-2',
        phone: '+1 555 555 1212',
        email: 'jamie+other@example.com',
        sms_consent: true,
      },
      {
        id: 'aud-3',
        rep_id: 'rep-1',
        phone: '+1 555 555 2222',
        email: 'other@example.com',
        sms_consent: true,
      },
    ])

    const result = await unsubscribeCustomerAudienceByPhone(
      client,
      '+15555551212',
      {
        markStopKeywordReceived: true,
      },
    )

    expect(result.updatedCount).toBe(2)
    expect(result.smsUpdatedCount).toBe(2)
    expect(updateCalls).toHaveLength(1)
    expect(updateCalls[0].ids).toEqual(['aud-1', 'aud-2'])
    expect(updateCalls[0].values.sms_opted_out_at).toEqual(expect.any(String))
    expect(updateCalls[0].values.stop_keyword_received_at).toEqual(
      expect.any(String),
    )
  })

  it('supports rep-scoped web unsubscribes for both email and SMS channels', async () => {
    const { client, updateCalls } = makeSupabase([
      {
        id: 'aud-1',
        rep_id: 'rep-preview',
        phone: '(555) 555-1212',
        email: 'jamie@example.com',
        sms_consent: true,
        email_consent: true,
      },
      {
        id: 'aud-2',
        rep_id: 'rep-other',
        phone: '(555) 555-1212',
        email: 'jamie@example.com',
        sms_consent: true,
        email_consent: true,
      },
    ])

    const result = await unsubscribeCustomerAudienceByContact(client, {
      repId: 'rep-preview',
      phone: '555-555-1212',
      email: 'JAMIE@example.com',
      unsubscribeSms: true,
      unsubscribeEmail: true,
    })

    expect(result.updatedCount).toBe(1)
    expect(result.smsUpdatedCount).toBe(1)
    expect(result.emailUpdatedCount).toBe(1)
    expect(updateCalls).toHaveLength(1)
    expect(updateCalls[0].ids).toEqual(['aud-1'])
    expect(updateCalls[0].values.sms_opted_out_at).toEqual(expect.any(String))
    expect(updateCalls[0].values.email_opted_out_at).toEqual(expect.any(String))
  })

  it('can unsubscribe a single audience member by id without touching duplicates', async () => {
    const { client, updateCalls, selectFilters, updateFilters } = makeSupabase([
      {
        id: 'aud-1',
        rep_id: 'rep-preview',
        name: 'Jamie Lane',
        phone: '(555) 555-1212',
        email: 'jamie@example.com',
        sms_consent: true,
        email_consent: true,
        marketing_consent: true,
        consent_date: '2026-05-05T12:00:00Z',
        sms_opted_out_at: null,
        email_opted_out_at: null,
        stop_keyword_received_at: null,
        created_at: '2026-05-05T12:00:00Z',
      },
      {
        id: 'aud-2',
        rep_id: 'rep-preview',
        name: 'Jamie Lane Duplicate',
        phone: '(555) 555-1212',
        email: 'jamie@example.com',
        sms_consent: true,
        email_consent: true,
        marketing_consent: true,
        consent_date: '2026-05-04T12:00:00Z',
        sms_opted_out_at: null,
        email_opted_out_at: null,
        stop_keyword_received_at: null,
        created_at: '2026-05-04T12:00:00Z',
      },
    ])

    const result = await unsubscribeCustomerAudienceMember(client, 'rep-preview', {
      audienceId: 'aud-1',
      unsubscribeSms: true,
      unsubscribeEmail: false,
    })

    expect(result.updatedCount).toBe(1)
    expect(result.smsUpdatedCount).toBe(1)
    expect(result.emailUpdatedCount).toBe(0)
    expect(updateCalls).toHaveLength(1)
    expect(updateCalls[0].ids).toEqual(['aud-1'])
    expect(updateCalls[0].values.sms_opted_out_at).toEqual(expect.any(String))
    expect(updateCalls[0].values).not.toHaveProperty('email_opted_out_at')
    expect(selectFilters).toEqual([
      ['id', 'aud-1'],
      ['rep_id', 'rep-preview'],
    ])
    expect(updateFilters).toEqual([
      ['id', 'aud-1'],
      ['rep_id', 'rep-preview'],
    ])
  })

  it('returns one mapped audience member by id for the authenticated rep', async () => {
    const { client, selectFilters } = makeSupabase([
      {
        id: 'aud-1',
        rep_id: 'rep-preview',
        name: 'Jamie Lane',
        phone: '(555) 555-1212',
        email: 'jamie@example.com',
        sms_consent: true,
        email_consent: true,
        marketing_consent: true,
        consent_date: '2026-05-05T12:00:00Z',
        sms_opted_out_at: null,
        email_opted_out_at: null,
        stop_keyword_received_at: null,
        created_at: '2026-05-05T12:00:00Z',
      },
      {
        id: 'aud-2',
        rep_id: 'rep-other',
        name: 'Taylor Brooks',
        phone: null,
        email: 'taylor@example.com',
        sms_consent: false,
        email_consent: true,
        marketing_consent: true,
        consent_date: '2026-05-04T12:00:00Z',
        sms_opted_out_at: null,
        email_opted_out_at: null,
        stop_keyword_received_at: null,
        created_at: '2026-05-04T12:00:00Z',
      },
    ])

    const result = await getCustomerAudienceMember(client, 'rep-preview', 'aud-1')

    expect(result).toEqual({
      id: 'aud-1',
      name: 'Jamie Lane',
      identityLabel: null,
      profileVersion: 0,
      phone: '(555) 555-1212',
      email: 'jamie@example.com',
      smsConsent: true,
      emailConsent: true,
      marketingConsent: true,
      canReceiveSms: true,
      canReceiveEmail: true,
      consentDate: '2026-05-05T12:00:00Z',
      createdAt: '2026-05-05T12:00:00Z',
      smsOptedOutAt: null,
      emailOptedOutAt: null,
      stopKeywordReceivedAt: null,
    })
    expect(selectFilters).toEqual([
      ['id', 'aud-1'],
      ['rep_id', 'rep-preview'],
    ])
  })
})

function makeProfileSupabase(options?: { missingUpdate?: boolean }) {
  const audienceInserts: Array<Record<string, unknown>> = []
  const audienceUpdates: Array<Record<string, unknown>> = []
  const changeLogs: Array<Record<string, unknown>> = []
  const filters: Array<[string, unknown]> = []
  const storedRow: AudienceRow = {
    id: 'aud-profile-1',
    rep_id: 'rep-1',
    name: 'Jamie Lane',
    phone: '+15555550101',
    email: 'jamie@example.com',
    address: '101 Sparkle Way',
    birthday_month: 10,
    birthday_day: 12,
    favorite_gem_or_stone: 'Moonstone',
    favorite_material: 'Gold',
    favorite_cut: 'Oval',
    favorite_collection: 'Simply Studs',
    notes: 'Local pickup',
    tags: ['VIP'],
    sms_consent: false,
    email_consent: false,
    marketing_consent: false,
    consent_date: null,
    sms_opted_out_at: null,
    email_opted_out_at: null,
    stop_keyword_received_at: null,
    created_at: '2026-08-04T12:00:00Z',
  }

  const client = {
    from(table: string) {
      if (table === 'customer_audience_change_log') {
        return {
          insert(values: Record<string, unknown>) {
            changeLogs.push(values)
            return Promise.resolve({ error: null })
          },
        }
      }

      if (table !== 'customer_audience') {
        throw new Error(`Unexpected table ${table}`)
      }

      return {
        insert(values: Record<string, unknown>) {
          audienceInserts.push(values)
          return {
            select() {
              return {
                single() {
                  return Promise.resolve({
                    data: { ...storedRow, ...values },
                    error: null,
                  })
                },
              }
            },
          }
        },
        update(values: Record<string, unknown>) {
          audienceUpdates.push(values)
          const chain = {
            eq(column: string, value: unknown) {
              filters.push([column, value])
              return chain
            },
            select() {
              return {
                maybeSingle() {
                  return Promise.resolve({
                    data: options?.missingUpdate ? null : { ...storedRow, ...values },
                    error: null,
                  })
                },
              }
            },
          }
          return chain
        },
      }
    },
  }

  return { client: client as never, audienceInserts, audienceUpdates, changeLogs, filters }
}

describe('customer audience contact profile services', () => {
  it('creates a manual contact without manufacturing consent and records the profile audit', async () => {
    const { client, audienceInserts, changeLogs } = makeProfileSupabase()

    const customer = await createCustomerAudienceContact(
      client,
      'rep-1',
      {
        name: ' Jamie Lane ',
        email: ' JAMIE@EXAMPLE.COM ',
        phone: ' (555) 555-0101 ',
        address: ' 101 Sparkle Way ',
        birthday: '10-12',
        favoriteGemOrStone: ' Moonstone ',
        favoriteMaterial: ' Gold ',
        favoriteCut: ' Oval ',
        favoriteCollection: ' Simply Studs ',
        notes: ' Local pickup ',
        tags: [' VIP ', 'VIP', ' local '],
      },
      { actorKind: 'nic_nac', actorRepId: 'rep-1', nicNacRunId: 'run-1' },
    )

    expect(audienceInserts).toEqual([
      expect.objectContaining({
        rep_id: 'rep-1',
        name: 'Jamie Lane',
        email: 'jamie@example.com',
        phone: '(555) 555-0101',
        birthday_month: 10,
        birthday_day: 12,
        tags: ['VIP', 'local'],
        sms_consent: false,
        email_consent: false,
        marketing_consent: false,
      }),
    ])
    expect(customer).toMatchObject({
      name: 'Jamie Lane',
      birthday: '10-12',
      favoriteGemOrStone: 'Moonstone',
      tags: ['VIP', 'local'],
      smsConsent: false,
      emailConsent: false,
    })
    expect(changeLogs).toEqual([
      expect.objectContaining({
        audience_id: 'aud-profile-1',
        rep_id: 'rep-1',
        actor_kind: 'nic_nac',
        actor_rep_id: 'rep-1',
        nic_nac_run_id: 'run-1',
        action: 'created',
      }),
    ])
  })

  it('updates a rep-owned profile with id and rep guards but never writes consent columns', async () => {
    const { client, audienceUpdates, changeLogs, filters } = makeProfileSupabase()

    await updateCustomerAudienceContact(
      client,
      'rep-1',
      {
        audienceId: ' aud-profile-1 ',
        name: 'Jamie Lane',
        email: null,
        phone: null,
        birthday: null,
        tags: [],
      },
      { actorKind: 'rep', actorRepId: 'rep-1' },
    )

    expect(filters).toEqual([
      ['id', 'aud-profile-1'],
      ['rep_id', 'rep-1'],
    ])
    expect(audienceUpdates[0]).toMatchObject({
      name: 'Jamie Lane',
      email: null,
      phone: null,
      birthday_month: null,
      birthday_day: null,
      tags: [],
    })
    expect(audienceUpdates[0]).not.toHaveProperty('sms_consent')
    expect(audienceUpdates[0]).not.toHaveProperty('email_consent')
    expect(audienceUpdates[0]).not.toHaveProperty('marketing_consent')
    expect(changeLogs[0]).toMatchObject({ action: 'profile_updated' })
  })

  it('refuses a stale profile version instead of writing over a newer card', async () => {
    const { client, audienceUpdates, changeLogs, filters } = makeProfileSupabase({ missingUpdate: true })

    await expect(updateCustomerAudienceContact(client, 'rep-1', {
      audienceId: 'aud-profile-1',
      favoriteMaterial: 'Silver',
      expectedVersion: 4,
    })).rejects.toMatchObject({ code: 'INVALID_INPUT' })

    expect(filters).toEqual([
      ['id', 'aud-profile-1'],
      ['rep_id', 'rep-1'],
      ['profile_version', 4],
    ])
    expect(audienceUpdates).toEqual([{ favorite_material: 'Silver' }])
    expect(changeLogs).toEqual([])
  })

  it('filters duplicate names and birthday month only after every saved page', async () => {
    const page = (count: number, name: string, month: number, idPrefix: string, cut: string | null) => Array.from({ length: count }, (_, index) => ({
      id: `${idPrefix}-${index}`,
      rep_id: 'rep-1',
      name,
      identity_label: index === 1 ? 'Ohio' : null,
      profile_version: 2,
      phone: null,
      email: null,
      birthday_month: month,
      birthday_day: 9,
      favorite_cut: cut,
      sms_consent: false,
      email_consent: false,
      marketing_consent: false,
      consent_date: null,
      sms_opted_out_at: null,
      email_opted_out_at: null,
      stop_keyword_received_at: null,
      created_at: '2026-09-01T00:00:00Z',
    }))
    const pages = [page(1000, 'Other Person', 1, 'other', null), page(2, 'Jane Smith', 7, 'jane', 'Oval')]
    let calls = 0
    const client = {
      from() {
        return {
          select() {
            const chain = {
              eq() { return chain },
              order() { return chain },
              range() {
                const data = pages[calls] ?? []
                calls += 1
                return Promise.resolve({ data, error: null })
              },
            }
            return chain
          },
        }
      },
    }

    const result = await getCustomerAudience(client as never, 'rep-1', {
      query: 'jane smith',
      birthdayMonth: 7,
      favoriteCut: 'oval',
      limit: 25,
    })

    expect(calls).toBe(2)
    expect(result.summary.totalCustomers).toBe(1002)
    expect(result.customers.map((customer) => customer.id)).toEqual(['jane-0', 'jane-1'])
    expect(result.customers.map((customer) => customer.identityLabel)).toEqual([null, 'Ohio'])
  })

  it('preserves omitted profile fields during a partial update', async () => {
    const { client, audienceUpdates } = makeProfileSupabase()

    await updateCustomerAudienceContact(client, 'rep-1', {
      audienceId: 'aud-profile-1',
      favoriteMaterial: 'Silver',
    })

    expect(audienceUpdates).toEqual([
      { favorite_material: 'Silver' },
    ])
  })

  it('requires at least one profile field for a contact update', async () => {
    const { client, audienceUpdates } = makeProfileSupabase()

    await expect(
      updateCustomerAudienceContact(client, 'rep-1', {
        audienceId: 'aud-profile-1',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' })
    expect(audienceUpdates).toEqual([])
  })

  it('rejects invalid birthdays before a profile write', async () => {
    const { client, audienceInserts } = makeProfileSupabase()

    await expect(
      createCustomerAudienceContact(client, 'rep-1', {
        name: 'Jamie Lane',
        birthday: '02-30',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' })
    expect(audienceInserts).toEqual([])
  })

  it('imports a partial spreadsheet row as a profile-only update without clearing omitted fields', async () => {
    const existing: AudienceRow = {
      id: 'aud-import-1',
      rep_id: 'rep-1',
      name: 'Jamie Lane',
      phone: '+15555550101',
      email: 'jamie@example.com',
      address: '101 Sparkle Way',
      favorite_material: 'Gold',
      sms_consent: false,
      email_consent: false,
    }
    const audienceUpdates: Array<Record<string, unknown>> = []
    const changeLogs: Array<Record<string, unknown>> = []
    const client = {
      from(table: string) {
        if (table === 'customer_audience_change_log') {
          return {
            insert(values: Record<string, unknown>) {
              changeLogs.push(values)
              return Promise.resolve({ error: null })
            },
          }
        }
        if (table !== 'customer_audience') throw new Error(`Unexpected table ${table}`)

        return {
          select() {
            const chain = {
              not() { return chain },
              then(resolve: (value: { data: AudienceRow[]; error: null }) => unknown) {
                return Promise.resolve({ data: [existing], error: null }).then(resolve)
              },
            }
            return chain
          },
          update(values: Record<string, unknown>) {
            audienceUpdates.push(values)
            const chain = {
              eq() { return chain },
              select() {
                return {
                  maybeSingle() {
                    return Promise.resolve({ data: { ...existing, ...values }, error: null })
                  },
                }
              },
            }
            return chain
          },
        }
      },
    }

    const result = await importCustomerAudienceContacts(client as never, 'rep-1', [
      { name: 'Jamie Lane', email: 'jamie@example.com', favoriteMaterial: 'Silver' },
      { name: '' },
    ])

    expect(result).toEqual({
      createdCount: 0,
      updatedCount: 1,
      skipped: [{ row: 3, reason: 'Missing a customer name.' }],
    })
    expect(audienceUpdates).toEqual([
      { name: 'Jamie Lane', email: 'jamie@example.com', favorite_material: 'Silver' },
    ])
    expect(audienceUpdates[0]).not.toHaveProperty('address')
    expect(audienceUpdates[0]).not.toHaveProperty('sms_consent')
    expect(changeLogs).toEqual([expect.objectContaining({ action: 'profile_updated' })])
  })
})
