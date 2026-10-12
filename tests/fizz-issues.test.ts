import { afterEach, describe, expect, it, vi } from 'vitest'

import { ServiceError } from '@/lib/services/errors'
import {
  approveFizzIssue,
  assertFizzIssueId,
  fizzIdempotencyKey,
  stageFizzIssue,
} from '@/lib/services/fizz-issues'
import { createMemoryNoticeLedger } from '@/lib/services/notice-send-ledger'
import {
  SUITE_LIST_SEGMENT_ID,
  SUITE_LIST_TOPIC_ID,
  SUITE_OWNER_EMAIL,
  assertFizzEmailHtml,
} from '@/lib/services/suite-official-notice'
import {
  FIZZ_ITEM_SUMMARY_MAX,
  FIZZ_UNSUBSCRIBE_VAR,
  normalizeFizzContent,
  renderFizzIssueHtml,
} from '@/lib/services/fizz-issue-render'
import type { publishWorkspaceMessage } from '@/lib/services/workspace-messages'

const content = {
  issueDate: 'Monday, December 21, 2026',
  weekNote: 'Good morning! Here is your Weekly Fizz Report.\n\nThis week: one Suite update.',
  items: [
    {
      headline: 'Cards & QR is live',
      summary: 'Order business cards and QR flyers from Suite.',
      whatItMeans: 'You can print cards & flyers without leaving Suite.',
      sourceLabel: 'Open Cards & QR',
      sourceUrl: 'https://www.yoursparklesuite.com/cards',
    },
  ],
  latest: {
    kind: 'video' as const,
    title: 'How to set up your QR flyer',
    summary: 'A short walkthrough.',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  },
}
const renderedHtml = renderFizzIssueHtml(normalizeFizzContent(content), 'This week in Suite')

const OWNER_REP = '00000000-0000-4000-8000-000000000111'
const issue = {
  issue_id: '2026-W42',
  subject: 'Fizz week 42',
  preheader: 'This week in Suite',
  email_html: renderedHtml,
  workspace_title: 'Fizz week 42',
  workspace_summary: 'This week in Suite',
  workspace_body: 'The workspace copy for week 42.',
  action_url: 'https://www.yoursparklesuite.com/nic-nac',
  staged_by: 'suite',
  updated_at: '2026-10-12T00:00:00.000Z',
}

function supabaseFor(reps = [{ id: OWNER_REP, email: SUITE_OWNER_EMAIL, status: 'active' }]) {
  return {
    from(table: string) {
      const filters: Record<string, unknown> = {}
      const builder = {
        select() {
          return builder
        },
        eq(key: string, value: unknown) {
          filters[key] = value
          return builder
        },
        ilike() {
          return builder
        },
        limit() {
          return builder
        },
        maybeSingle: async () => ({
          data: table === 'fizz_staged_issues' ? issue : null,
          error: null,
        }),
        single: async () => ({ data: issue, error: null }),
        insert() {
          return builder
        },
        update() {
          return builder
        },
        then(resolve: (value: unknown) => unknown) {
          if (table === 'reps') {
            const data = reps.filter((rep) => rep.status === 'active')
            return Promise.resolve({ data, error: null }).then(resolve)
          }
          return Promise.resolve({ data: [], error: null }).then(resolve)
        },
      }
      return builder
    },
  }
}

function publication(audience: { kind: 'all_active' } | { kind: 'selected'; repIds: string[] }) {
  return {
    id: 'pub-fizz',
    audienceRule: audience,
    audienceCount: audience.kind === 'selected' ? audience.repIds.length : 12,
  } as Awaited<ReturnType<typeof publishWorkspaceMessage>>
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('fizz server render', () => {
  it('renders the Weekly Fizz template with the espresso Latest band and unsubscribe', () => {
    expect(renderedHtml).toContain('The Weekly <em')
    expect(renderedHtml).toContain('Latest from Sparkle Suite')
    expect(renderedHtml).toContain('#36221d')
    expect(renderedHtml).toContain(FIZZ_UNSUBSCRIBE_VAR)
    expect(renderedHtml).toContain('Good morning! Here is your Weekly Fizz Report.')
    expect(renderedHtml).toContain('This week: one Suite update.')
    expect(renderedHtml).not.toContain('<strong>This week:</strong>')
    expect(renderedHtml).toContain('cards &amp; flyers')
    expect(renderedHtml).toContain('https://i.ytimg.com/vi/dQw4w9WgXcQ/')
    expect(renderedHtml).toContain('>Watch</a>')
    expect(renderedHtml).not.toMatch(/\{\{\{(?!RESEND_UNSUBSCRIBE_URL)[A-Z_]+\}\}\}/)
    expect(renderedHtml).not.toContain('Resend shell')
    expect(renderedHtml).not.toContain('{{{CTA_URL}}}')
  })

  it('labels a blog Read and keeps the band on a slow week', () => {
    const html = renderFizzIssueHtml(
      normalizeFizzContent({
        ...content,
        items: [],
        latest: { kind: 'blog', title: 'Blog post', summary: 'Read it.', url: 'https://www.yoursparklesuite.com/blog/x', thumbnailUrl: 'https://www.yoursparklesuite.com/x.png' },
      }),
      'Slow week',
    )
    expect(html).toContain('>Read</a>')
    expect(html).toContain('Latest from Sparkle Suite')
  })

  it('renders item summary and what-it-means as paragraphs with bold lead labels', () => {
    const ink = "margin:0 0 12px;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#402924;"
    const muted = "margin:0 0 12px;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#775d57;"
    const label = 'L'.repeat(40)
    const html = renderFizzIssueHtml(
      normalizeFizzContent({
        ...content,
        items: [
          {
            ...content.items[0],
            summary: [
              `What changed: Cards now print from Suite.\nStill one paragraph.`,
              `Why it matters: You stay in one place.`,
              `${label}: kept`,
              `${'A'.repeat(41)}: still plain`,
              'https://example.com/notes: leave this plain',
              'See www.example.com/help: also plain',
              "Q&A: Tom & Jerry <3. Don't skip it.",
              'Intro line\nWhat changed: not a lead label',
            ].join('\n\n'),
            whatItMeans: 'Do this: Print before the show.\nBring the flyer.\n \nSkip this: A second tab.',
          },
        ],
      }),
      'This week in Suite',
    )

    expect(html).toContain(`<p style="${ink}"><strong>What changed:</strong> Cards now print from Suite.<br>Still one paragraph.</p>`)
    expect(html).toContain(`<p style="${ink}"><strong>Why it matters:</strong> You stay in one place.</p>`)
    expect(html).toContain(`<p style="${ink}"><strong>${label}:</strong> kept</p>`)
    expect(html).toContain(`<p style="${ink}">${'A'.repeat(41)}: still plain</p>`)
    expect(html).not.toContain(`<strong>${'A'.repeat(41)}:</strong>`)
    expect(html).toContain('<p style="' + ink + '">https://example.com/notes: leave this plain</p>')
    expect(html).not.toContain('<strong>https:</strong>')
    expect(html).toContain('See www.example.com/help: also plain')
    expect(html).not.toContain('<strong>See www.example.com/help:</strong>')
    expect(html).toContain("<p style=\"" + ink + "\"><strong>Q&amp;A:</strong> Tom &amp; Jerry &lt;3. Don&#39;t skip it.</p>")
    expect(html).toContain(`<p style="${ink}">Intro line<br>What changed: not a lead label</p>`)
    expect(html).toContain(`<p style="${muted}"><strong>Do this:</strong> Print before the show.<br>Bring the flyer.</p>`)
    expect(html).toContain(`<p style="${muted}"><strong>Skip this:</strong> A second tab.</p>`)
    expect(html).not.toContain('<strong>This week:</strong>')
    expect(() =>
      normalizeFizzContent({
        ...content,
        items: [{ ...content.items[0], summary: 'What changed: <b>nope</b> is raw HTML' }],
      }),
    ).toThrow(/plain text/)
  })

  it('accepts a 2000-character item summary and rejects 2001', () => {
    expect(FIZZ_ITEM_SUMMARY_MAX).toBe(2000)
    const summary = `S${'a'.repeat(FIZZ_ITEM_SUMMARY_MAX - 1)}`
    const normalized = normalizeFizzContent({
      ...content,
      items: [{ ...content.items[0], summary: `  ${summary}  ` }],
    })
    expect(normalized.items[0].summary).toBe(summary)
    expect(normalized.items[0].summary).toHaveLength(2000)
    expect(() =>
      normalizeFizzContent({
        ...content,
        items: [{ ...content.items[0], summary: `${summary}b` }],
      }),
    ).toThrow(/Item 1 summary must be 3 to 2000 characters/)
  })

  it('rejects raw HTML and missing house style', async () => {
    expect(() => normalizeFizzContent({ ...content, emailHtml: '<p>x</p>' })).toThrow(/Raw email HTML/)
    expect(() => normalizeFizzContent({ ...content, weekNote: '<p>Good morning friends and reps</p>' })).toThrow(/plain text/)
    expect(() => normalizeFizzContent({ ...content, weekNote: 'Hello there, this is the weekly note.' })).toThrow(/Good morning/)
    expect(() => normalizeFizzContent({ ...content, latest: undefined })).toThrow(/Latest/)
    expect(() => normalizeFizzContent({ ...content, items: Array(6).fill(content.items[0]) })).toThrow(/five/)
    await expect(
      stageFizzIssue({} as never, {
        issueId: '2026-W42',
        subject: issue.subject,
        preheader: issue.preheader,
        emailHtml: '<p>raw</p>',
        content,
        workspaceTitle: issue.workspace_title,
        workspaceSummary: issue.workspace_summary,
        workspaceBody: issue.workspace_body,
        stagedBy: 'suite',
      } as never),
    ).rejects.toThrow(/Raw email HTML/)
  })
})

describe('fizz approve-once', () => {
  it('rejects unsafe issue ids and active email HTML', () => {
    expect(() => assertFizzIssueId('2026-W54')).toThrow(ServiceError)
    expect(() => assertFizzIssueId('week-42')).toThrow(/2026-W42/)
    expect(fizzIdempotencyKey('2026-W42', 'test', 'email')).toBe('fizz-2026-W42-test-email')
    expect(fizzIdempotencyKey('2026-W42', 'live', 'broadcast')).toBe('fizz-2026-W42-live-broadcast')
    expect(() => assertFizzEmailHtml('<p onclick="alert(1)">Hi there from Fizz</p>')).toThrow(/active content/)
    expect(() => assertFizzEmailHtml('<p><a href="javascript:alert(1)">Open</a> weekly note</p>')).toThrow(
      /active content/,
    )
  })

  it('refuses to restage an issue that already has a sent result', async () => {
    const sentSupabase = {
      from() {
        const builder = {
          select() {
            return builder
          },
          eq() {
            return builder
          },
          limit: async () => ({ data: [{ idempotency_key: 'fizz-2026-W42-test-email' }], error: null }),
        }
        return builder
      },
    }
    await expect(
      stageFizzIssue(sentSupabase as never, {
        issueId: '2026-W42',
        subject: issue.subject,
        preheader: issue.preheader,
        content,
        workspaceTitle: issue.workspace_title,
        workspaceSummary: issue.workspace_summary,
        workspaceBody: issue.workspace_body,
        stagedBy: 'suite',
      }),
    ).rejects.toThrow(/cannot be restaged/)
  })

  it('test mode emails only the owner and posts only to that rep', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_key')
    vi.stubEnv('RESEND_FROM_EMAIL', 'notifications@yoursparklesuite.com')
    vi.stubEnv('SPARKLE_ENVIRONMENT', 'production')
    vi.stubEnv('NEXT_PUBLIC_SPARKLE_ENVIRONMENT', 'production')
    vi.stubEnv('SPARKLE_FIZZ_TEST_SEND', '')
    const urls: string[] = []
    const fetchImpl = vi.fn(async (url: string | URL, init?: RequestInit) => {
      urls.push(String(url))
      const body = JSON.parse(String(init?.body ?? '{}')) as { to?: string[] }
      expect(body.to).toEqual([SUITE_OWNER_EMAIL])
      return new Response(JSON.stringify({ id: 'em_test' }), { status: 200 })
    })
    const publish = vi.fn(async (_supabase: unknown, input: { audience: { kind: string; repIds?: string[] } }) => {
      expect(input.audience).toEqual({ kind: 'selected', repIds: [OWNER_REP] })
      return publication({ kind: 'selected', repIds: [OWNER_REP] })
    })
    const ledger = createMemoryNoticeLedger()
    const approved = await approveFizzIssue({
      supabase: supabaseFor() as never,
      issueId: '2026-W42',
      mode: 'test',
      ledger,
      fetchImpl,
      publish,
    })
    const replay = await approveFizzIssue({
      supabase: supabaseFor() as never,
      issueId: '2026-W42',
      mode: 'test',
      ledger,
      fetchImpl,
      publish,
    })

    expect(urls).toEqual(['https://api.resend.com/emails'])
    expect(urls.join(' ')).not.toContain('/broadcasts')
    expect(publish).toHaveBeenCalledTimes(1)
    expect(approved.email).toMatchObject({
      status: 'sent',
      idempotencyKey: 'fizz-2026-W42-test-email',
      replayed: false,
    })
    expect(approved.broadcast).toMatchObject({
      status: 'sent',
      idempotencyKey: 'fizz-2026-W42-test-broadcast',
      publicationId: 'pub-fizz',
    })
    expect(replay.email.replayed).toBe(true)
    expect(replay.broadcast.replayed).toBe(true)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('live mode uses the Suite list and all active reps', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_key')
    vi.stubEnv('RESEND_FROM_EMAIL', 'notifications@yoursparklesuite.com')
    vi.stubEnv('SPARKLE_ENVIRONMENT', 'live')
    const bodies: Array<Record<string, unknown>> = []
    const fetchImpl = vi.fn(async (url: string | URL, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>)
      return new Response(JSON.stringify({ id: String(url).endsWith('/send') ? 'sent' : 'brd_live' }), {
        status: 200,
      })
    })
    const publish = vi.fn(async (_supabase: unknown, input: { audience: { kind: string } }) => {
      expect(input.audience).toEqual({ kind: 'all_active' })
      return publication({ kind: 'all_active' })
    })
    const approved = await approveFizzIssue({
      supabase: supabaseFor() as never,
      issueId: '2026-W42',
      mode: 'live',
      ledger: createMemoryNoticeLedger(),
      fetchImpl,
      publish,
    })
    expect(bodies[0]).toMatchObject({
      segment_id: SUITE_LIST_SEGMENT_ID,
      topic_id: SUITE_LIST_TOPIC_ID,
      html: issue.email_html,
    })
    expect(bodies[0]).not.toHaveProperty('to')
    expect(approved.email.idempotencyKey).toBe('fizz-2026-W42-live-email')
    expect(approved.broadcast.idempotencyKey).toBe('fizz-2026-W42-live-broadcast')
  })

  it('keeps the workspace post when email fails, and the email when the post fails', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_key')
    vi.stubEnv('RESEND_FROM_EMAIL', 'notifications@yoursparklesuite.com')
    vi.stubEnv('SPARKLE_ENVIRONMENT', 'live')
    const emailDown = vi.fn(async () => new Response(JSON.stringify({ message: 'nope' }), { status: 500 }))
    const publishOk = vi.fn(async () => publication({ kind: 'selected', repIds: [OWNER_REP] }))
    const emailFailed = await approveFizzIssue({
      supabase: supabaseFor() as never,
      issueId: '2026-W42',
      mode: 'test',
      ledger: createMemoryNoticeLedger(),
      fetchImpl: emailDown,
      publish: publishOk,
    })
    expect(emailFailed.email.status).toBe('failed')
    expect(emailFailed.broadcast.status).toBe('sent')

    const emailOk = vi.fn(async () => new Response(JSON.stringify({ id: 'em_ok' }), { status: 200 }))
    const publishDown = vi.fn(async () => {
      throw new Error('workspace down')
    })
    const postFailed = await approveFizzIssue({
      supabase: supabaseFor() as never,
      issueId: '2026-W42',
      mode: 'test',
      ledger: createMemoryNoticeLedger(),
      fetchImpl: emailOk,
      publish: publishDown,
    })
    expect(postFailed.email.status).toBe('sent')
    expect(postFailed.broadcast.status).toBe('failed')
  })

  it('blocks live approval on Smoke before either channel runs', async () => {
    vi.stubEnv('SPARKLE_ENVIRONMENT', 'smoke')
    const fetchImpl = vi.fn()
    const publish = vi.fn()
    await expect(
      approveFizzIssue({
        supabase: supabaseFor() as never,
        issueId: '2026-W42',
        mode: 'live',
        ledger: createMemoryNoticeLedger(),
        fetchImpl,
        publish,
      }),
    ).rejects.toThrow(/disabled on Smoke/)
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(publish).not.toHaveBeenCalled()
  })

  it('does not post in test mode unless exactly one owner rep exists', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_key')
    vi.stubEnv('RESEND_FROM_EMAIL', 'notifications@yoursparklesuite.com')
    vi.stubEnv('SPARKLE_ENVIRONMENT', 'live')
    const publish = vi.fn()
    const approved = await approveFizzIssue({
      supabase: supabaseFor([]) as never,
      issueId: '2026-W42',
      mode: 'test',
      ledger: createMemoryNoticeLedger(),
      fetchImpl: vi.fn(async () => new Response(JSON.stringify({ id: 'em_ok' }), { status: 200 })),
      publish,
    })
    expect(publish).not.toHaveBeenCalled()
    expect(approved.broadcast.status).toBe('failed')
    expect(approved.email.status).toBe('sent')
  })
})
