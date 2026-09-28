import { afterEach, describe, expect, it } from 'vitest'

import { laneAccountingSecurityResponse } from '@/lib/lane-accounting/security'

describe('Cheese accounting connector security', () => {
  const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  afterEach(() => {
    delete process.env.LANE_ACCOUNTING_INGEST_TOKEN
    if (originalSupabaseUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl
    if (originalServiceRoleKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey
  })

  it('fails closed until the dedicated Cheese token is configured', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    expect((await laneAccountingSecurityResponse(
      new Request('https://www.yoursparklesuite.com/api/lane/accounting/mcp'),
    ))?.status).toBe(503)
  })

  it('accepts only its dedicated bearer token', async () => {
    process.env.LANE_ACCOUNTING_INGEST_TOKEN = 'lane-test-token'
    expect(await laneAccountingSecurityResponse(
      new Request('https://www.yoursparklesuite.com/api/lane/accounting/mcp', {
        headers: { authorization: 'Bearer lane-test-token' },
      }),
    )).toBeNull()
    expect((await laneAccountingSecurityResponse(
      new Request('https://www.yoursparklesuite.com/api/lane/accounting/mcp', {
        headers: { authorization: 'Bearer shared-control-center-token' },
      }),
    ))?.status).toBe(401)
  })
})
