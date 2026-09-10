import { expect, it } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { listOperatorCustomerProfiles } from '@/lib/services/client-account-profiles'
import { operatorCustomerSearch } from '@/lib/services/operator-customer-search'

type Row = Record<string, string | null>
function fixture() {
  const requests: URL[] = []
  const reps: Row[] = Array.from({ length: 225 }, (_, i) => ({ id: String(i).padStart(3, '0'), business_name: `Original ${String(i).padStart(3, '0')}`, display_name: `Contact ${i}`, email: `original${i}@example.test`, account_classification: i === 224 ? 'demo' : 'customer' }))
  const profiles: Row[] = reps.slice(110).map(rep => ({ id: `profile-${rep.id}`, rep_id: rep.id, client_name: 'Needle customer', show_name: `Current show ${rep.id}`, primary_contact_name: `Current contact ${rep.id}`, email: `current${rep.id}@example.test`, internal_notes: 'Preserved notes' }))
  function matches(row: Row, filter: string | null) {
    if (!filter) return false
    return [...filter.matchAll(/(\w+)\.imatch\.("(?:\\.|[^"\\])*")/g)].some(([,field,value]) => new RegExp(JSON.parse(value), 'i').test(String(row[field] ?? '')))
  }
  const client = createClient('https://example.test', 'test-key', { auth: { persistSession: false }, global: { fetch: async input => {
    const url = new URL(String(input)); requests.push(url)
    const table = url.pathname.split('/').at(-1)
    let rows: Row[] = []
    if (table === 'reps') {
      rows = reps.filter(rep => {
        const classification = url.searchParams.get('account_classification')
        if (classification && classification !== `eq.${rep.account_classification}`) return false
        const ids = url.searchParams.get('id')
        if (ids && !ids.slice(4,-1).split(',').includes(String(rep.id))) return false
        const filter = url.searchParams.get('or')
        if (!filter) return true
        return matches(rep, filter) || (filter.includes('search_profile.not.is.null') && profiles.some(profile => profile.rep_id === rep.id && matches(profile, url.searchParams.get('search_profile.or'))))
      })
    } else if (table === 'client_account_profiles') {
      const ids = url.searchParams.get('rep_id')!.slice(4,-1).split(',')
      rows = profiles.filter(profile => ids.includes(String(profile.rep_id)))
    }
    const offset = Number(url.searchParams.get('offset') ?? 0)
    return new Response(JSON.stringify(rows.slice(offset,offset + Number(url.searchParams.get('limit') ?? 500))), { headers: { 'Content-Type': 'application/json' } })
  } } })
  return { client, reps, profiles, requests }
}

it('searches profile overrides before paging and hydrates only the selected customers', async () => {
  const { client, requests } = fixture()
  const first = await listOperatorCustomerProfiles(client, { query: 'needle', limit: 100 })
  const last = await listOperatorCustomerProfiles(client, { query: 'needle', limit: 100, offset: 100 })
  expect(first.map(row => row.repId)).toEqual(Array.from({ length: 100 }, (_,i) => String(110+i)))
  expect(last.map(row => row.repId)).toEqual(Array.from({ length: 15 }, (_,i) => String(210+i)))
  expect(first[0]).toMatchObject({ clientName: 'Needle customer', showName: 'Current show 110', email: 'current110@example.test', internalNotes: 'Preserved notes' })
  const repRequests = requests.filter(url => url.pathname.endsWith('/reps'))
  expect(repRequests.map(url => url.searchParams.get('order'))).toEqual(['business_name.asc,id.asc','business_name.asc,id.asc'])
  expect(repRequests[0].searchParams.get('select')).toContain('search_profile:client_account_profiles!client_account_profiles_rep_id_fkey(id)')
  const hydration = requests.filter(url => url.pathname.endsWith('/client_account_profiles'))
  expect(hydration[0].searchParams.get('rep_id')).toBe(`in.(${first.map(row => row.repId).join(',')})`)
  expect(hydration[1].searchParams.get('rep_id')).toBe(`in.(${last.map(row => row.repId).join(',')})`)
})

it.each(['client_name','show_name','primary_contact_name','email'])('finds literal punctuation in displayed %s without expanding wildcards', async field => {
  const { client, profiles } = fixture()
  const term = '100% *, ("yes") [a].+$^?\\'
  profiles[90][field] = term
  profiles[91][field] = '100% anything, yes a'
  const rows = await listOperatorCustomerProfiles(client, { query: term })
  expect(rows.map(row => row.repId)).toEqual(['200'])
})

it('retains historical identity search with absent or overridden profiles', async () => {
  const { client } = fixture()
  for (const id of ['001','200']) {
    const rows = await listOperatorCustomerProfiles(client, { query: `Original ${id}` })
    expect(rows.map(row => row.repId)).toEqual([id])
  }
})

it('keeps classification and selected identities ANDed with the search', async () => {
  const { client } = fixture()
  const rows = await listOperatorCustomerProfiles(client, { query: 'needle', classification: 'customer', repIds: ['001','200','224'] })
  expect(rows.map(row => row.repId)).toEqual(['200'])
})

it('leaves blank searches without added joins and bounds the search term', async () => {
  const { client, requests } = fixture()
  expect((await listOperatorCustomerProfiles(client, { query: '  ', limit: 1 }))[0].repId).toBe('000')
  expect(requests[0].searchParams.has('or')).toBe(false)
  expect(requests[0].searchParams.get('select')).not.toContain('search_profile')
  expect(operatorCustomerSearch(null)).toBeNull()
  expect(operatorCustomerSearch('x'.repeat(300))?.profileFilter).toContain(`client_name.imatch."${'x'.repeat(240)}",`)
})
