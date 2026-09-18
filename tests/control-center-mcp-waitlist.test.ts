import { describe, expect, it, vi } from 'vitest'

import {
  buildControlCenterWaitlistGetResult,
  buildControlCenterWaitlistListResult,
  getControlCenterWaitlistLead,
  listControlCenterWaitlistLeads,
  normalizeWaitlistStatusFilter,
} from '@/lib/remy-communications/waitlist'

const TEST_LEAD_ID = '9eb4a98c-dff9-4775-afe0-0d53fe52dac4'

const waitlistRow = {
  id: TEST_LEAD_ID,
  name: 'TEST Lead',
  email: 'test@example.com',
  phone: null,
  tiktok_handle: null,
  source: 'prelaunch_site',
  lead_status: 'new',
  intake_submission_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  created_at: '2026-09-17T16:00:00.000Z',
}

function thenable<T extends object>(target: T, result: { data: unknown; error: unknown }) {
  return Object.assign(target, {
    then(resolve: (value: { data: unknown; error: unknown }) => unknown, reject?: (reason: unknown) => unknown) {
      return Promise.resolve(result).then(resolve, reject)
    },
  })
}

function createClient(options: {
  waitlist?: { data: unknown; error: unknown }
  intake?: { data: unknown; error: unknown }
}) {
  const waitlistCalls: Array<{ method: string; args: unknown[] }> = []
  const intakeCalls: Array<{ method: string; args: unknown[] }> = []

  function chain(
    calls: Array<{ method: string; args: unknown[] }>,
    result: { data: unknown; error: unknown },
  ) {
    const query = {
      select: (...args: unknown[]) => {
        calls.push({ method: 'select', args })
        return query
      },
      order: (...args: unknown[]) => {
        calls.push({ method: 'order', args })
        return query
      },
      limit: (...args: unknown[]) => {
        calls.push({ method: 'limit', args })
        return query
      },
      eq: (...args: unknown[]) => {
        calls.push({ method: 'eq', args })
        return query
      },
      in: (...args: unknown[]) => {
        calls.push({ method: 'in', args })
        return query
      },
      maybeSingle: async () => {
        calls.push({ method: 'maybeSingle', args: [] })
        return result
      },
    }
    return thenable(query, result)
  }

  return {
    waitlistCalls,
    intakeCalls,
    from: vi.fn((table: string) => {
      if (table === 'sparkle_suite_waitlist') {
        return chain(waitlistCalls, options.waitlist ?? { data: [], error: null })
      }
      if (table === 'sparkle_suite_intake_submissions') {
        return chain(intakeCalls, options.intake ?? { data: [], error: null })
      }
      throw new Error(`unexpected table ${table}`)
    }),
  }
}

describe('Control Center waitlist MCP reads', () => {
  it('treats blank status as no filter so list matches classic Control Center', () => {
    expect(normalizeWaitlistStatusFilter(undefined)).toBeUndefined()
    expect(normalizeWaitlistStatusFilter('')).toBeUndefined()
    expect(normalizeWaitlistStatusFilter('   ')).toBeUndefined()
    expect(normalizeWaitlistStatusFilter('new')).toBe('new')
  })

  it('lists existing classic waitlist rows instead of a false empty array', async () => {
    const client = createClient({
      waitlist: { data: [waitlistRow], error: null },
      intake: { data: [{ id: waitlistRow.intake_submission_id, business_name: 'Test Shop' }], error: null },
    })

    const leads = await listControlCenterWaitlistLeads(client as never, { limit: 25 })

    expect(client.from).toHaveBeenCalledWith('sparkle_suite_waitlist')
    expect(client.waitlistCalls.some((call) => call.method === 'eq')).toBe(false)
    expect(leads).toEqual([
      {
        leadId: TEST_LEAD_ID,
        name: 'TEST Lead',
        shopName: 'Test Shop',
        contact: { email: 'test@example.com', phone: null, tiktokHandle: null },
        signupSource: 'prelaunch_site',
        signupDate: '2026-09-17T16:00:00.000Z',
        status: 'new',
      },
    ])
    expect(buildControlCenterWaitlistListResult(leads).matchedCount).toBe(1)
    expect(buildControlCenterWaitlistListResult([]).notice).toContain('table is empty')
  })

  it('still returns waitlist rows when linked intake lookup fails', async () => {
    const client = createClient({
      waitlist: { data: [waitlistRow], error: null },
      intake: { data: null, error: { message: 'intake unavailable' } },
    })

    const leads = await listControlCenterWaitlistLeads(client as never)

    expect(leads).toHaveLength(1)
    expect(leads[0]?.leadId).toBe(TEST_LEAD_ID)
    expect(leads[0]?.shopName).toBeNull()
  })

  it('gets a known classic waitlist id and does not treat a missing id as an outage', async () => {
    const foundClient = createClient({
      waitlist: { data: { ...waitlistRow, intake_submission_id: null }, error: null },
    })
    const lead = await getControlCenterWaitlistLead(foundClient as never, TEST_LEAD_ID)
    expect(buildControlCenterWaitlistGetResult(lead, TEST_LEAD_ID)).toMatchObject({
      found: true,
      leadId: TEST_LEAD_ID,
      lead: { name: 'TEST Lead' },
    })

    const missingClient = createClient({
      waitlist: { data: null, error: null },
    })
    const missing = await getControlCenterWaitlistLead(missingClient as never, TEST_LEAD_ID)
    expect(missing).toBeNull()
    expect(buildControlCenterWaitlistGetResult(missing, TEST_LEAD_ID)).toMatchObject({
      found: false,
      lead: null,
      leadId: TEST_LEAD_ID,
    })
    expect(buildControlCenterWaitlistGetResult(missing, TEST_LEAD_ID).notice).toContain('not an outage')
  })

  it('applies a status filter only when one is actually supplied', async () => {
    const client = createClient({
      waitlist: { data: [waitlistRow], error: null },
    })
    await listControlCenterWaitlistLeads(client as never, { status: 'new', limit: 10 })
    expect(client.waitlistCalls).toContainEqual({ method: 'eq', args: ['lead_status', 'new'] })
    expect(client.waitlistCalls).toContainEqual({ method: 'limit', args: [10] })
  })
})
