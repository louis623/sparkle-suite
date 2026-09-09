import { describe, expect, it } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { listOperatorConversations } from '@/lib/services/workspace-conversations'
import { operatorConversationSearch } from '@/lib/services/operator-conversation-search'

function fixture(reportedIds: string[] = ['reported']) {
  const requests: URL[] = []
  const all = Array.from({ length: 70 }, (_, index) => ({
    id: `support-${index}`, conversation_type: 'support', state: 'open',
    subject: index >= 60 ? 'Needle help' : 'Other help', latest_message_preview: '',
    latest_message_sender_display_name: 'Support', last_message_at: String(100 - index), updated_at: '',
  }))
  all.push(...['private', 'reported'].map(id => ({ ...all[60], id, conversation_type: 'rep_direct' })))
  const client = createClient('https://example.test', 'test-key', {
    global: { fetch: async (input) => {
      const url = new URL(String(input)); requests.push(url)
      let data: unknown[] = []
      if (url.pathname.endsWith('/workspace_conversation_reports')) {
        data = reportedIds.map(id => ({ conversation_id: id, status: 'open' }))
      } else if (url.pathname.endsWith('/workspace_conversations')) {
        // This transport fixture models database filtering BEFORE the requested range.
        // Separate assertions below inspect the real Supabase query wire contract.
        let matches = all.filter(row => row.conversation_type !== 'rep_direct' || reportedIds.includes(row.id))
        if (url.searchParams.get('conversation_type') === 'eq.rep_direct') matches = matches.filter(row => row.conversation_type === 'rep_direct')
        if (url.searchParams.has('id')) matches = matches.filter(row => reportedIds.includes(row.id))
        if (url.searchParams.getAll('or').some(value => value.includes('subject.imatch.'))) matches = matches.filter(row => row.subject.includes('Needle'))
        const offset = Number(url.searchParams.get('offset') ?? 0)
        data = matches.slice(offset, offset + Number(url.searchParams.get('limit') ?? 50))
      }
      return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } })
    } },
    auth: { persistSession: false },
  })
  return { client, requests }
}

describe('operator conversation global search', () => {
  it('searches before paging, reaching matches beyond the unfiltered first page', async () => {
    const { client, requests } = fixture()
    const first = await listOperatorConversations(client, { query: 'Needle', limit: 3, offset: 0 })
    const second = await listOperatorConversations(client, { query: 'Needle', limit: 3, offset: 3 })
    expect(first.conversations.map(row => row.id)).toEqual(['support-60', 'support-61', 'support-62'])
    expect(second.conversations.map(row => row.id)).toEqual(['support-63', 'support-64', 'support-65'])
    const pages = requests.filter(url => url.pathname.endsWith('/workspace_conversations'))
    expect(pages).toHaveLength(2)
    expect(pages.map(url => [url.searchParams.get('offset'), url.searchParams.get('limit')])).toEqual([['0', '3'], ['3', '3']])
    for (const url of pages) {
      expect(url.searchParams.get('order')).toBe('last_message_at.desc,id.desc')
      expect(url.searchParams.getAll('or')).toEqual([
        '(subject.imatch."Needle",latest_message_preview.imatch."Needle",latest_message_sender_display_name.imatch."Needle",and(conversation_type.eq.support,search_requester.not.is.null))',
        '(conversation_type.neq.rep_direct,id.in.(reported))',
      ])
    }
  })

  it('restricts requester name joins and leaves unrelated subject matches possible', async () => {
    const { client, requests } = fixture()
    await listOperatorConversations(client, { query: 'Needle', type: 'support', state: 'open' })
    const params = requests.find(url => url.pathname.endsWith('/workspace_conversations'))!.searchParams
    expect(params.get('select')).toContain('search_requester:workspace_conversation_participants!workspace_conversation_participants_conversation_id_fkey(id,search_rep:reps!workspace_conversation_participants_rep_id_fkey!inner(id))')
    expect(params.get('search_requester.principal_type')).toBe('eq.rep')
    expect(params.get('search_requester.role')).toBe('eq.requester')
    expect(params.get('search_requester.search_rep.or')).toBe('(business_name.imatch."Needle",display_name.imatch."Needle")')
    expect(params.get('state')).toBe('eq.open')
  })

  it('never makes unreported direct messages searchable, including explicit network scope', async () => {
    const { client, requests } = fixture()
    const result = await listOperatorConversations(client, { query: 'Needle', type: 'rep_direct' })
    expect(result.conversations.map(row => row.id)).toEqual(['reported'])
    const params = requests.find(url => url.pathname.endsWith('/workspace_conversations'))!.searchParams
    expect(params.get('conversation_type')).toBe('eq.rep_direct')
    expect(params.get('id')).toBe('in.(reported)')
    const empty = fixture([])
    expect((await listOperatorConversations(empty.client, { query: 'Needle', type: 'rep_direct' })).conversations).toEqual([])
    expect(empty.requests.some(url => url.pathname.endsWith('/workspace_conversations'))).toBe(false)
  })

  it('preserves reported-only filtering with a search', async () => {
    const { client, requests } = fixture()
    await listOperatorConversations(client, { query: 'Needle', reportedOnly: true })
    expect(requests.find(url => url.pathname.endsWith('/workspace_conversations'))!.searchParams.get('id')).toBe('in.(reported)')
  })

  it('escapes regex and PostgREST punctuation as literal input, bounds length, and skips blanks', () => {
    const term = '100% *, ("yes") [a].+$^?\\'
    const search = operatorConversationSearch(term)!
    const quoted = search.repFilter.slice('business_name.imatch.'.length).split(',display_name.imatch.')[0]
    const regex = new RegExp(JSON.parse(quoted), 'i')
    expect(regex.test(term)).toBe(true)
    expect(regex.test('100% anything, yes a')).toBe(false)
    expect(operatorConversationSearch('   ')).toBeNull()
    expect(operatorConversationSearch('x'.repeat(300))!.repFilter).toBe(`business_name.imatch."${'x'.repeat(240)}",display_name.imatch."${'x'.repeat(240)}"`)
  })

  it('does not change legacy query shape when there is no search', async () => {
    const { client, requests } = fixture([])
    await listOperatorConversations(client, { type: 'support' })
    const params = requests.find(url => url.pathname.endsWith('/workspace_conversations'))!.searchParams
    expect(params.get('select')).not.toContain('search_requester')
    expect(params.getAll('or')).toEqual([])
  })
})
