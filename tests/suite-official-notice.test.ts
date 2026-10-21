import { afterEach, describe, expect, it, vi } from 'vitest'

import { createMemoryNoticeLedger } from '@/lib/services/notice-send-ledger'
import {
  SUITE_LIST_FROM,
  SUITE_LIST_REPLY_TO,
  SUITE_LIST_SEGMENT_ID,
  SUITE_LIST_TOPIC_ID,
  SUITE_OWNER_EMAIL,
  assertRetryableFailedNotice,
  deliverSingleOwnerEmail,
  deliverSuiteListNotice,
  parseSuiteListResourceNoticeKey,
  renderSuiteOfficialNoticeHtml,
  suiteNoticePlainText,
  suiteNoticeVariables,
} from '@/lib/services/suite-official-notice'

const WORKSPACE_SUPPORT_URL =
  'https://www.yoursparklesuite.com/nic-nac?section=messages&view=support&src=email'

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

  it('sends one Suite-list broadcast with rendered html and replays the same key without another fetch', async () => {
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
    const rendered = renderSuiteOfficialNoticeHtml(content)
    expect(calls[0]?.url).toBe('https://api.resend.com/broadcasts')
    expect(calls[0]?.body).toMatchObject({
      segment_id: SUITE_LIST_SEGMENT_ID,
      topic_id: SUITE_LIST_TOPIC_ID,
      from: SUITE_LIST_FROM,
      reply_to: SUITE_LIST_REPLY_TO,
      html: rendered.html,
    })
    expect(calls[0]?.body.html).toContain('{{{RESEND_UNSUBSCRIBE_URL}}}')
    expect(calls[0]?.body.text).toContain('Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}')
    expect(calls[0]?.body).not.toHaveProperty('template')
    expect(calls[0]?.body).not.toHaveProperty('to')
    expect(calls[1]?.url).toBe('https://api.resend.com/broadcasts/brd_1/send')
    expect(calls.map((call) => call.key)).toEqual([
      'suite-list:publication:pub-1:create',
      'suite-list:publication:pub-1:send',
    ])
  })

  it('retries a failed Suite-list send once and never resends a success or an in-progress send', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_key')
    vi.stubEnv('RESEND_FROM_EMAIL', 'notifications@yoursparklesuite.com')
    vi.stubEnv('SPARKLE_ENVIRONMENT', 'live')
    vi.stubEnv('NEXT_PUBLIC_SPARKLE_ENVIRONMENT', '')
    const key = 'suite-list:resource:958bd34d-7b46-4570-b115-ec3ea12f86f0:v1'
    let rejectCreate = true
    const calls: Array<{ url: string; body: Record<string, unknown>; key: string | null }> = []
    const fetchImpl = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>
      calls.push({
        url: String(url),
        body,
        key: new Headers(init?.headers).get('Idempotency-Key'),
      })
      if (String(url).endsWith('/broadcasts') && rejectCreate) {
        return new Response(
          JSON.stringify({ message: 'At least one of `html` or `text` must be provided.' }),
          { status: 422 },
        )
      }
      return resendOk(String(url).endsWith('/broadcasts') ? 'brd_retry' : 'brd_sent')
    })
    const ledger = createMemoryNoticeLedger()
    const args = {
      ledger,
      idempotencyKey: key,
      sourceKind: 'workspace_resource' as const,
      sourceId: '958bd34d-7b46-4570-b115-ec3ea12f86f0',
      content,
      fetchImpl,
    }
    const failed = await deliverSuiteListNotice(args)
    expect(failed).toMatchObject({ status: 'failed', broadcastId: null, replayed: false })
    expect(calls[0]?.body.html).toContain('{{{RESEND_UNSUBSCRIBE_URL}}}')

    rejectCreate = false
    const retried = await deliverSuiteListNotice(args)
    expect(retried).toMatchObject({ status: 'sent', broadcastId: 'brd_retry', replayed: false })
    const creates = calls.filter((call) => call.url === 'https://api.resend.com/broadcasts')
    expect(creates).toHaveLength(2)
    expect(creates[1]?.body.html).toBe(renderSuiteOfficialNoticeHtml(content).html)
    expect(creates[1]?.key).toMatch(new RegExp(`^${key}:create:`))
    expect(creates[1]?.key).not.toBe(creates[0]?.key)

    const replayed = await deliverSuiteListNotice(args)
    expect(replayed).toMatchObject({ status: 'sent', broadcastId: 'brd_retry', replayed: true })
    expect(calls.filter((call) => call.url === 'https://api.resend.com/broadcasts')).toHaveLength(2)

    let releaseCreate: () => void = () => {}
    const createGate = new Promise<void>((resolve) => {
      releaseCreate = resolve
    })
    const overlapCalls: string[] = []
    const slowFetch = vi.fn(async (url: string | URL) => {
      overlapCalls.push(String(url))
      if (String(url).endsWith('/broadcasts')) await createGate
      return resendOk(String(url).endsWith('/broadcasts') ? 'brd_slow' : 'brd_slow_sent')
    })
    const overlapLedger = createMemoryNoticeLedger()
    const overlapKey = 'suite-list:resource:11111111-1111-4111-8111-111111111111:v1'
    const first = deliverSuiteListNotice({
      ledger: overlapLedger,
      idempotencyKey: overlapKey,
      sourceKind: 'workspace_resource',
      sourceId: '11111111-1111-4111-8111-111111111111',
      content,
      fetchImpl: slowFetch,
    })
    await vi.waitFor(() => expect(slowFetch).toHaveBeenCalledTimes(1))
    const overlap = await deliverSuiteListNotice({
      ledger: overlapLedger,
      idempotencyKey: overlapKey,
      sourceKind: 'workspace_resource',
      sourceId: '11111111-1111-4111-8111-111111111111',
      content,
      fetchImpl: slowFetch,
    })
    expect(overlap).toMatchObject({ status: 'in_progress', replayed: true, broadcastId: null })
    expect(slowFetch).toHaveBeenCalledTimes(1)
    releaseCreate()
    await expect(first).resolves.toMatchObject({ status: 'sent', broadcastId: 'brd_slow', replayed: false })
    expect(overlapCalls.filter((url) => url === 'https://api.resend.com/broadcasts')).toHaveLength(1)
  })

  it('retries a failed send by posting the saved broadcast and does not create another', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_key')
    vi.stubEnv('RESEND_FROM_EMAIL', 'notifications@yoursparklesuite.com')
    vi.stubEnv('SPARKLE_ENVIRONMENT', 'live')
    vi.stubEnv('NEXT_PUBLIC_SPARKLE_ENVIRONMENT', '')
    const calls: string[] = []
    let failSend = true
    const fetchImpl = vi.fn(async (url: string | URL) => {
      calls.push(String(url))
      if (String(url).endsWith('/send') && failSend) {
        return new Response(JSON.stringify({ message: 'send failed' }), { status: 500 })
      }
      return resendOk(String(url).endsWith('/broadcasts') ? 'brd_saved' : 'brd_sent')
    })
    const ledger = createMemoryNoticeLedger()
    const args = {
      ledger,
      idempotencyKey: 'suite-list:resource:958bd34d-7b46-4570-b115-ec3ea12f86f0:v1',
      sourceKind: 'workspace_resource' as const,
      sourceId: '958bd34d-7b46-4570-b115-ec3ea12f86f0',
      content,
      fetchImpl,
    }
    const failed = await deliverSuiteListNotice(args)
    expect(failed).toMatchObject({ status: 'failed', broadcastId: 'brd_saved' })
    failSend = false
    const retried = await deliverSuiteListNotice(args)
    expect(retried).toMatchObject({ status: 'sent', broadcastId: 'brd_saved', replayed: false })
    expect(calls.filter((url) => url === 'https://api.resend.com/broadcasts')).toHaveLength(1)
    expect(calls.filter((url) => url.endsWith('/send'))).toHaveLength(2)
  })

  it('parses a resource notice key and refuses to retry anything that is not failed', () => {
    expect(parseSuiteListResourceNoticeKey('suite-list:resource:958bd34d-7b46-4570-b115-ec3ea12f86f0:v1')).toEqual({
      resourceId: '958bd34d-7b46-4570-b115-ec3ea12f86f0',
      version: 1,
    })
    expect(() => assertRetryableFailedNotice({ status: 'failed' })).not.toThrow()
    expect(() => assertRetryableFailedNotice(null)).toThrow(/nothing is retried/)
    expect(() => assertRetryableFailedNotice({ status: 'sent' })).toThrow(/will not be sent again/)
    expect(() => assertRetryableFailedNotice({ status: 'pending' })).toThrow(/still sending/)
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

  it('renders the legal name, address, and Workspace Support link in the HTML footer', () => {
    const rendered = renderSuiteOfficialNoticeHtml(content)
    expect(rendered.html).toContain(
      "Neon Rabbit Digital Services LLC<br>2126 St. Martin's Drive West, Jacksonville, FL 32246",
    )
    expect(rendered.html).toContain(
      'This is an automated notice, so please don\'t reply to this email. To reach Louis, use Workspace Support in your <a href="https://www.yoursparklesuite.com/nic-nac?section=messages&amp;view=support&amp;src=email" style="color:#402924;text-decoration:underline;">Sparkle Suite workspace</a>.',
    )
    expect(rendered.html).toContain('{{{RESEND_UNSUBSCRIBE_URL}}}')
    expect(rendered.html).not.toContain('This is a notification. Please don\'t reply to this email.')
  })

  it('adds a plain-text footer and keeps the thumbnail URL and unsubscribe line', () => {
    const thumbnailUrl = 'https://www.yoursparklesuite.com/brand/sparkle-suite-logo-transparent.png'
    const text = suiteNoticePlainText({ ...content, thumbnailUrl })
    const thumbnailAt = text.indexOf(thumbnailUrl)
    const companyAt = text.indexOf('Neon Rabbit Digital Services LLC')
    const unsubscribeAt = text.indexOf('Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}')

    expect(thumbnailAt).toBeGreaterThan(-1)
    expect(companyAt).toBeGreaterThan(thumbnailAt)
    expect(text).toContain("2126 St. Martin's Drive West, Jacksonville, FL 32246")
    expect(text).toContain(
      "This is an automated notice, so please don't reply to this email. To reach Louis, use Workspace Support in your Sparkle Suite workspace:",
    )
    expect(text).toContain(WORKSPACE_SUPPORT_URL)
    expect(unsubscribeAt).toBeGreaterThan(companyAt)
    expect(text.trimEnd().endsWith('Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}')).toBe(true)
  })

  it('omits an unsafe thumbnail and still includes the plain-text footer', () => {
    const text = suiteNoticePlainText({ ...content, thumbnailUrl: 'javascript:alert(1)' })
    expect(text).not.toContain('javascript:')
    expect(text).toContain('Neon Rabbit Digital Services LLC')
    expect(text).toContain(WORKSPACE_SUPPORT_URL)
    expect(text.trimEnd().endsWith('Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}')).toBe(true)
  })
})
