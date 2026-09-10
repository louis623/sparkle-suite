import { expect, it } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { readLocWaitlist, waitlistSearch } from '@/lib/loc-control-center/waitlist'

function fixture() {
  const requests: URL[] = []
  const rows = Array.from({ length: 225 }, (_, index) => ({
    id: String(index).padStart(3, '0'), name: `Person ${index}`, email: `person${index}@example.test`,
    phone: null as string | null, operator_notes: index >= 110 ? 'Needle contact' : '',
    source: 'operator_manual', lead_status: 'new', account_activated_at: null, created_at: '2026-09-09', updated_at: '2026-09-09',
  }))
  const client = createClient('https://example.test', 'test-key', {
    auth: { persistSession: false },
    global: { fetch: async input => {
      const url = new URL(String(input)); requests.push(url)
      let selected = rows.slice()
      const filter = url.searchParams.get('or')
      if (filter) {
        const conditions = [...filter.matchAll(/(\w+)\.imatch\.("(?:\\.|[^"\\])*")/g)]
          .map(([, field, value]) => [field, new RegExp(JSON.parse(value), 'i')] as const)
        selected = selected.filter(row => conditions.some(([field, regex]) => regex.test(String(row[field as keyof typeof row] ?? ''))))
      }
      const offset = Number(url.searchParams.get('offset') ?? 0)
      return new Response(JSON.stringify(selected.slice(offset, offset + Number(url.searchParams.get('limit')))), { headers: { 'Content-Type': 'application/json' } })
    } },
  })
  return { client, rows, requests }
}

it('finds records beyond the unfiltered first 100 and pages the matching set with lookahead', async () => {
  const { client, requests } = fixture()
  const first = await readLocWaitlist(client, { query: 'needle' }, { limit: 100, offset: 0 })
  expect(first.items).toHaveLength(100)
  expect(first.items[0].id).toBe('110')
  expect(first.items.at(-1)?.id).toBe('209')
  expect(first.nextOffset).toBe(100)
  const last = await readLocWaitlist(client, { query: 'needle' }, { limit: 100, offset: 100 })
  expect(last.items.map(row => row.id)).toEqual(Array.from({ length: 15 }, (_, i) => String(210 + i)))
  expect(last.nextOffset).toBeNull()
  expect(requests.map(url => [url.searchParams.get('offset'), url.searchParams.get('limit')])).toEqual([['0', '101'], ['100', '101']])
  expect(requests[0].searchParams.get('order')).toBe('created_at.desc,id.asc')
})

it.each(['name', 'email', 'phone', 'operator_notes'] as const)('matches %s literally including PostgREST and regex punctuation', async field => {
  const { client, rows } = fixture()
  const term = '100% *, ("yes") [a].+$^?\\'
  rows[200][field] = term
  rows[201][field] = '100% anything, yes a'
  const result = await readLocWaitlist(client, { query: term }, { limit: 100, offset: 0 })
  expect(result.items.map(row => row.id)).toEqual(['200'])
  expect(result.nextOffset).toBeNull()
})

it('leaves blank searches unfiltered and bounds search length', async () => {
  const { client, requests } = fixture()
  const result = await readLocWaitlist(client, { query: '   ' }, { limit: 100, offset: 100 })
  expect(result.items[0].id).toBe('100')
  expect(requests[0].searchParams.has('or')).toBe(false)
  expect(waitlistSearch(null)).toBeNull()
  expect(waitlistSearch('x'.repeat(300))).toContain(`name.imatch."${'x'.repeat(240)}",`)
})
