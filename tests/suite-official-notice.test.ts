import { afterEach, describe, expect, it, vi } from 'vitest'

import { createMemoryNoticeLedger } from '@/lib/services/notice-send-ledger'
import {
  SUITE_LIST_FROM,
  SUITE_LIST_REPLY_TO,
  SUITE_LIST_SEGMENT_ID,
  SUITE_LIST_TOPIC_ID,
  SUITE_OFFICIAL_NOTICE_TEMPLATE_ID,
  SUITE_OWNER_EMAIL,
  deliverSingleOwnerEmail,
  deliverSuiteListNotice,
  renderSuiteOfficialNoticeHtml,
  suiteNoticeVariables,
} from '@/lib/services/suite-official-notice'

const content = {
  preheader: 'A short note',
  headline: 'Suite update',
  message: 'Line one\n<script>alert(1)</script>',
  ctaLabel: 'Open update',
  ctaUrl: 'https://www.yoursparklesuite.com/nic-nac',
  thumbnailUrl: null,
}

function resendOk(id: string) {
  return new Response(JSON.stringify({ id }), { status: 200 })
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('suite official notices', () => {
  it('escapes message HTML and rejects a javascript button link', () => {
    const rendered = renderSuiteOfficialNoticeHtml(content)
    expect(rendered.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(rendered.html).not.toContain('<script>alert(1)</script>')
    expect(rendered.variables.MESSAGE).toContain('<br>')
    expect(() =>
      suiteNoticeVariables({ ...content, ctaUrl: 'javascript:alert(1)' }),
    ).toThrow(/secure https URL/)
  })

  it('sends one Suite-list template broadcast and replays the same key without another fetch', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_key')
    vi.stubEnv('RESEND_FROM_EMAIL', 'notifications@yoursparklesuite.com')
    vi.stubEnv('SPARKLE_ENVIRONMENT', 'live')
    vi.stubEnv('NEXT_PUBLIC_SPARKLE_ENVIRONMENT', '')
    const calls: Array<{ url: string; body: Record<string, unknown>; key: string | null }> = []
    const fetchImpl = vi.fn(async (url: string | URL, init?: RequestInit) => {
      calls.push({
        url: String(url),
        body: JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>,
        key: new Headers(init?.headers).get('Idempotency-Key'),
      })
      return resendOk(calls.length === 1 ? 'brd_1' : 'brd_sent')
    })
    const ledger = createMemoryNoticeLedger()
    const first = await deliverSuiteListNotice({
      ledger,
      idempotencyKey: 'suite-list:publication:pub-1',
      sourceKind: 'workspace_publication',
      sourceId: 'pub-1',
      content,
      fetchImpl,
    })
    const second = await deliverSuiteListNotice({
      ledger,
      idempotencyKey: 'suite-list:publication:pub-1',
      sourceKind: 'workspace_publication',
      sourceId: 'pub-1',
      content,
      fetchImpl,
    })

    expect(first).toMatchObject({ status: 'sent', broadcastId: 'brd_1', replayed: false })
    expect(second).toMatchObject({ status: 'sent', broadcastId: 'brd_1', replayed: true })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(calls[0]?.url).toBe('https://api.resend.com/broadcasts')
    expect(calls[0]?.body).toMatchObject({
      segment_id: SUITE_LIST_SEGMENT_ID,
      topic_id: SUITE_LIST_TOPIC_ID,
      from: SUITE_LIST_FROM,
      reply_to: SUITE_LIST_REPLY_TO,
      template: { id: SUITE_OFFICIAL_NOTICE_TEMPLATE_ID },
    })
    expect(calls[0]?.body).not.toHaveProperty('to')
    expect(calls[1]?.url).toBe('https://api.resend.com/broadcasts/brd_1/send')
    expect(calls.map((call) => call.key)).toEqual([
      'suite-list:publication:pub-1:create',
      'suite-list:publication:pub-1:send',
    ])
  })

  it('blocks Suite-list sends on Smoke before a ledger claim or a fetch', async () => {
    vi.stubEnv('SPARKLE_ENVIRONMENT', 'smoke')
    const fetchImpl = vi.fn()
    const ledger = createMemoryNoticeLedger()
    const claim = vi.spyOn(ledger, 'claim')
    const result = await deliverSuiteListNotice({
      ledger,
      idempotencyKey: 'suite-list:publication:pub-2',
      sourceKind: 'workspace_publication',
      sourceId: 'pub-2',
      content,
      fetchImpl,
    })
    expect(result.status).toBe('blocked')
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(claim).not.toHaveBeenCalled()
  })

  it.each(['live', 'production', ''])(
    'sends the owner test email on Live (%s) without SPARKLE_FIZZ_TEST_SEND',
    async (environment) => {
      vi.stubEnv('RESEND_API_KEY', 're_test_key')
      vi.stubEnv('RESEND_FROM_EMAIL', 'notifications@yoursparklesuite.com')
      vi.stubEnv('SPARKLE_ENVIRONMENT', environment)
      vi.stubEnv('NEXT_PUBLIC_SPARKLE_ENVIRONMENT', environment)
      vi.stubEnv('SPARKLE_FIZZ_TEST_SEND', '')
      const fetchImpl = vi.fn(async (url: string | URL, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>
        expect(String(url)).toBe('https://api.resend.com/emails')
        expect(body.to).toEqual([SUITE_OWNER_EMAIL])
        expect(body.to).toHaveLength(1)
        expect(body).not.toHaveProperty('segment_id')
        expect(body).not.toHaveProperty('bcc')
        expect(body).not.toHaveProperty('cc')
        return resendOk('em_1')
      })
      const sent = await deliverSingleOwnerEmail({
        idempotencyKey: 'fizz-2026-W42-test-email',
        subject: 'Fizz test',
        html: '<p>Hello from Fizz weekly issue.</p>',
        fetchImpl,
      })
      expect(sent).toEqual({ ok: true, id: 'em_1' })
      expect(fetchImpl).toHaveBeenCalledTimes(1)
    },
  )

  it('refuses the owner test email on Smoke unless the test send flag is set', async () => {
    vi.stubEnv('SPARKLE_ENVIRONMENT', 'smoke')
    vi.stubEnv('SPARKLE_FIZZ_TEST_SEND', '')
    const fetchImpl = vi.fn()
    const blocked = await deliverSingleOwnerEmail({
      idempotencyKey: 'fizz-2026-W42-test-email',
      subject: 'Fizz test',
      html: '<p>Hello from Fizz weekly issue.</p>',
      fetchImpl,
    })
    expect(blocked.ok).toBe(false)
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})
