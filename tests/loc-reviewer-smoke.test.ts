import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
vi.mock('server-only', () => ({}))
const state = vi.hoisted(() => ({ workspace: vi.fn(), currentUser: null as any, verifiedId: 'loc-user', admin: null as any }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => {
  if (!state.admin) throw new Error('Fixture database must not be touched')
  return state.admin
} }))
vi.mock('@/lib/self-serve/signup', () => ({ createSelfServeWorkspaceForAuthUser: (...args: any[]) => state.workspace(...args) }))
vi.mock('@supabase/ssr', () => ({ createServerClient: (_url: string, _key: string, options: any) => ({ auth: {
  getUser: async () => ({ data: { user: state.currentUser }, error: null }),
  verifyOtp: async () => { options.cookies.setAll([{ name: 'fixture-session', value: 'private-session', options: { httpOnly: true } }]);
    return { data: { user: { id: state.verifiedId }, session: {} }, error: null } },
} }) }))
import { LOC_REVIEWER_EMAIL, LOC_REVIEWER_SCOPE, prepareLocReviewer, verifyLocReviewerToken } from '@/lib/reviewer-smoke/loc-session'

function fixture(options: { existing?: boolean, unsafeUser?: boolean, unsafeRep?: boolean, paid?: boolean, missingWriteRow?: boolean } = {}) {
  const calls: Array<{ table: string, method: string, value: any }> = []
  const user = { id: 'loc-user', email: LOC_REVIEWER_EMAIL, app_metadata: { loc_reviewer_scope: options.unsafeUser ? 'other-reviewer' : LOC_REVIEWER_SCOPE } }
  let exists = !!options.existing
  const rep = { id: 'loc-rep', auth_user_id: 'loc-user', email: LOC_REVIEWER_EMAIL, account_classification: options.unsafeRep ? 'customer' : 'demo', finder_directory_visible: false, custom_domain: null, public_site_slug: null }
  const saved: Record<string, any> = {
    reps: options.existing ? rep : null,
    subscriptions: options.existing ? { stripe_subscription_id: 'sub_loc_reviewer_loc-rep', stripe_customer_id: 'cus_loc_reviewer_loc-rep', stripe_livemode: !!options.paid, monthly_amount: options.paid ? 99 : 0 } : null,
    self_serve_setup_sessions: options.existing ? { rep_id: 'loc-rep', answers: { personalTestNote: 'preserve me' }, support_state: { existingNote: true } } : null,
  }
  const admin = { auth: { admin: {
    listUsers: vi.fn(async () => ({ data: { users: exists ? [user] : [] }, error: null })),
    createUser: vi.fn(async (input: any) => { calls.push({ table: 'auth', method: 'create', value: input }); exists = true; return { data: { user }, error: null } }),
    generateLink: vi.fn(async () => ({ data: { user, properties: { hashed_token: 'server-only-otp' } }, error: null })),
  } }, from(table: string) {
    if (!['reps', 'subscriptions', 'self_serve_setup_sessions'].includes(table)) throw new Error(`Unexpected side effect table ${table}`)
    const builder: any = { select: () => builder, eq: () => builder,
      maybeSingle: async () => ({ data: saved[table], error: null }),
      single: async () => ({ data: options.missingWriteRow ? null : saved[table], error: null }),
      insert: (value: any) => { calls.push({ table, method: 'insert', value }); saved[table] = value; return builder },
      update: (value: any) => { calls.push({ table, method: 'update', value }); saved[table] = { ...saved[table], ...value }; return builder },
      then: (resolve: any) => resolve({ error: null }),
    }; return builder
  } }
  state.workspace.mockImplementation(async () => { saved.reps = rep; return { repId: rep.id } })
  return { admin: admin as any, calls, saved }
}
beforeEach(() => {
  vi.clearAllMocks(); state.currentUser = null; state.verifiedId = 'loc-user'; state.admin = null
  process.env.LOC_REVIEWER_SMOKE_TOKEN = 'separate-test-key-'.repeat(3)
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fixture.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'fixture-public-key'
})
describe('dedicated LOC reviewer identity and fixture safety', () => {
  it('requires a separate sufficiently long exact key', () => {
    expect(() => verifyLocReviewerToken(process.env.LOC_REVIEWER_SMOKE_TOKEN)).not.toThrow()
    expect(() => verifyLocReviewerToken('wrong')).toThrow('invalid')
    process.env.LOC_REVIEWER_SMOKE_TOKEN = 'short'
    expect(() => verifyLocReviewerToken('short')).toThrow('not configured')
  })
  it.each([{ unsafeUser: true }, { unsafeRep: true }, { paid: true }])('rejects conflicting existing identities before ANY mutation: %j', async option => {
    const f = fixture({ existing: true, ...option })
    await expect(prepareLocReviewer('dashboard_unlocked', f.admin)).rejects.toThrow()
    expect(f.calls).toEqual([]); expect(state.workspace).not.toHaveBeenCalled()
    expect(f.admin.auth.admin.generateLink).not.toHaveBeenCalled()
  })
  it('creates only the exact synthetic identity, nonlive zero entitlement and setup state', async () => {
    const f = fixture(); const result = await prepareLocReviewer('dashboard_unlocked', f.admin)
    expect(result).toMatchObject({ repId: 'loc-rep', tokenHash: 'server-only-otp' })
    const auth = f.calls.find(row => row.table === 'auth')!.value
    expect(auth.email).toBe(LOC_REVIEWER_EMAIL); expect(auth.password.length).toBeGreaterThanOrEqual(48)
    expect(auth.app_metadata.loc_reviewer_scope).toBe(LOC_REVIEWER_SCOPE)
    expect(state.workspace).toHaveBeenCalledWith(expect.objectContaining({ accountClassification: 'demo', finderDirectoryVisible: false }), f.admin)
    expect(f.saved.subscriptions).toMatchObject({ monthly_amount: 0, stripe_livemode: false })
    expect(f.calls.every(row => ['auth', 'reps', 'subscriptions', 'self_serve_setup_sessions'].includes(row.table))).toBe(true)
  })
  it('reopens and switches setup state without resetting data, password or entitlement', async () => {
    const f = fixture({ existing: true })
    await prepareLocReviewer('dashboard_unlocked', f.admin)
    await prepareLocReviewer('required_setup', f.admin)
    expect(f.calls.some(row => row.method === 'insert' || row.table === 'auth' || row.table === 'subscriptions')).toBe(false)
    expect(f.saved.self_serve_setup_sessions.answers).toEqual({ personalTestNote: 'preserve me' })
    expect(f.saved.self_serve_setup_sessions.support_state.existingNote).toBe(true)
    expect(f.saved.self_serve_setup_sessions.status).toBe('required_setup')
    expect(f.admin.auth.admin.generateLink).toHaveBeenCalledTimes(2)
  })
  it('reports session mint failure without deleting the fixture', async () => {
    const f = fixture({ existing: true })
    f.admin.auth.admin.generateLink.mockResolvedValue({ data: {}, error: new Error('failed') })
    await expect(prepareLocReviewer('dashboard_unlocked', f.admin)).rejects.toThrow('retained')
    expect(f.calls.some(row => row.method === 'delete')).toBe(false)
  })
  it('refuses session issuance when the guarded rep update matches no row', async () => {
    const f = fixture({ existing: true, missingWriteRow: true })
    await expect(prepareLocReviewer('dashboard_unlocked', f.admin)).rejects.toThrow('changed during setup')
    expect(f.admin.auth.admin.generateLink).not.toHaveBeenCalled()
  })
})

describe('dedicated LOC browser route', () => {
  function request(body: any, origin = 'https://www.yoursparklesuite.com') {
    return new NextRequest('https://www.yoursparklesuite.com/api/reviewer-smoke/loc-session', {
      method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body),
    })
  }
  it('denies cross-origin, extra identity fields, invalid key, and oversized bodies before fixture access', async () => {
    const { POST } = await import('@/app/api/reviewer-smoke/loc-session/route')
    for (const [body, origin, status] of [
      [{}, 'https://attacker.test', 403],
      [{ token: process.env.LOC_REVIEWER_SMOKE_TOKEN, state: 'dashboard_unlocked', email: 'other@example.test' }, undefined, 400],
      [{ token: 'wrong', state: 'dashboard_unlocked' }, undefined, 403],
      [{ token: 'x'.repeat(3000), state: 'dashboard_unlocked' }, undefined, 413],
    ] as const) expect((await POST(request(body, origin))).status).toBe(status)
  })
  it('does not replace a current personal/customer browser session', async () => {
    state.currentUser = { id: 'customer', email: 'customer@example.test', app_metadata: {} }
    const { POST } = await import('@/app/api/reviewer-smoke/loc-session/route')
    const response = await POST(request({ token: process.env.LOC_REVIEWER_SMOKE_TOKEN, state: 'dashboard_unlocked' }))
    expect(response.status).toBe(409); expect(response.headers.get('set-cookie')).toBeNull()
    expect(response.headers.get('cache-control')).toContain('no-store')
  })
  it('exchanges the OTP server-side, sets the normal session, and returns no credentials', async () => {
    state.admin = fixture({ existing: true }).admin
    const { POST } = await import('@/app/api/reviewer-smoke/loc-session/route')
    const response = await POST(request({ token: process.env.LOC_REVIEWER_SMOKE_TOKEN, state: 'dashboard_unlocked' }))
    expect(response.status).toBe(200)
    expect(response.headers.get('set-cookie')).toContain('fixture-session=')
    expect(await response.json()).toEqual({ ok: true, repId: 'loc-rep', state: 'dashboard_unlocked', next: '/nic-nac' })
  })
  it('does not issue cookies if the resulting auth identity differs', async () => {
    state.admin = fixture({ existing: true }).admin; state.verifiedId = 'unrelated-user'
    const { POST } = await import('@/app/api/reviewer-smoke/loc-session/route')
    const response = await POST(request({ token: process.env.LOC_REVIEWER_SMOKE_TOKEN, state: 'dashboard_unlocked' }))
    expect(response.status).toBe(503); expect(response.headers.get('set-cookie')).toBeNull()
  })
})
