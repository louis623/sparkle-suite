import { createElement, createRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

import {
  ConversationThread,
  getSafeMessageActionUrl,
  getSafeYouTubeActionUrl,
} from '@/app/nic-nac/components/messages/ConversationThread'
import { MessageCenter } from '@/app/nic-nac/components/messages/MessageCenter'
import { MESSAGE_CENTER_PRIMARY_VIEW_COUNT } from '@/app/nic-nac/components/messages/MessageCenterFilters'
import { RepMessageRequestCard } from '@/app/nic-nac/components/messages/RepMessageRequestCard'
import { SupportComposer } from '@/app/nic-nac/components/messages/SupportComposer'
import {
  REVIEW_CONVERSATION_DETAILS,
  REVIEW_INBOX_FIXTURES,
  REVIEW_TEAM_CONVERSATION_ID,
} from '@/app/nic-nac/components/messages/review-fixtures'
import { filterInboxItems } from '@/app/nic-nac/components/messages/useMessageCenter'
import type { WorkspacePublicationSummary } from '@/app/nic-nac/components/messages/types'

describe('unified Workspace Message Center UI', () => {
  it('uses exactly the six friendly primary views and one consistent inbox', () => {
    const html = renderToStaticMarkup(
      createElement(MessageCenter, {
        state: {
          status: 'ready',
          inbox: {
            unreadCount: 4,
            messages: REVIEW_INBOX_FIXTURES,
          },
        },
        actionState: { pendingKey: null, error: null, helperMessage: null },
        reviewMode: true,
        draftScope: 'review-rep',
        onUpdatePublication: vi.fn(),
        onRetry: vi.fn(),
      }),
    )

    expect(MESSAGE_CENTER_PRIMARY_VIEW_COUNT).toBe(6)
    for (const label of [
      'All',
      'Team',
      'Rep Network',
      'Support',
      'Sparkle Suite',
      'Archived',
    ]) {
      expect(html).toContain(`>${label}<`)
    }
    expect(html).toContain('New message')
    expect(html).toContain('Unread Team message')
    expect(html).toContain('Message request')
    expect(html).toContain('Official update')
    expect(html).not.toMatch(/publication|delivery|principal|outbox/i)
  })

  it('filters Team, Rep Network, Support, Sparkle Suite, and Archived without mixing systems', () => {
    expect(
      filterInboxItems(REVIEW_INBOX_FIXTURES, 'team', 'all').every(
        (item) => item.kind === 'conversation' && item.conversationType === 'team_onboarding',
      ),
    ).toBe(true)
    expect(filterInboxItems(REVIEW_INBOX_FIXTURES, 'rep-network', 'all')).toHaveLength(2)
    expect(filterInboxItems(REVIEW_INBOX_FIXTURES, 'support', 'all')).toHaveLength(2)
    expect(filterInboxItems(REVIEW_INBOX_FIXTURES, 'sparkle-suite', 'all')).toHaveLength(2)
    expect(filterInboxItems(REVIEW_INBOX_FIXTURES, 'sparkle-suite', 'resources')).toHaveLength(1)
    expect(filterInboxItems(REVIEW_INBOX_FIXTURES, 'archived', 'all')).toHaveLength(1)
  })

  it('renders reply controls for a Team conversation with compact workflow context', () => {
    const item = REVIEW_INBOX_FIXTURES.find(
      (candidate) => candidate.id === REVIEW_TEAM_CONVERSATION_ID,
    )!
    const html = renderToStaticMarkup(
      createElement(ConversationThread, {
        item,
        detail: REVIEW_CONVERSATION_DETAILS[REVIEW_TEAM_CONVERSATION_ID],
        detailStatus: 'ready',
        actionPending: false,
        actionError: null,
        draftScope: 'review-rep',
        headingRef: createRef<HTMLHeadingElement>(),
        onBack: vi.fn(),
        onSendReply: vi.fn(),
        onRequestDecision: vi.fn(),
        onReport: vi.fn(),
        onBlock: vi.fn(),
        onArchive: vi.fn(),
        onMute: vi.fn(),
        onRetry: vi.fn(),
      }),
    )

    expect(html).toContain('Back to Messages')
    expect(html).toContain('New Rep Onboarding')
    expect(html).toContain('3 of 5 steps complete')
    expect(html).toContain('Reply to Taylor Brooks')
    expect(html).toContain('Write a message')
    expect(html).toContain('Send')
  })

  it('never shows a composer on an official Sparkle Suite update', () => {
    const publication: WorkspacePublicationSummary = {
      kind: 'publication',
      id: 'official-1',
      deliveryId: 'delivery-1',
      senderDisplayName: 'Sparkle Suite',
      title: 'Scheduled maintenance complete',
      summary: 'Everything is operating normally.',
      body: 'No action is needed.',
      category: 'platform_update',
      isRead: false,
      readAt: null,
      createdAt: '2026-08-26T12:00:00.000Z',
    }
    const html = renderToStaticMarkup(
      createElement(ConversationThread, {
        item: publication,
        detail: null,
        detailStatus: 'idle',
        actionPending: false,
        actionError: null,
        headingRef: createRef<HTMLHeadingElement>(),
        onBack: vi.fn(),
        onSendReply: vi.fn(),
        onRequestDecision: vi.fn(),
        onReport: vi.fn(),
        onBlock: vi.fn(),
        onArchive: vi.fn(),
        onMute: vi.fn(),
        onRetry: vi.fn(),
      }),
    )

    expect(html).toContain('Verified sender')
    expect(html).toContain('This is an official Sparkle Suite update')
    expect(html).not.toContain('<textarea')
    expect(html).not.toContain('Reply to')
  })

  it('renders a workspace link and a separately protected YouTube action for a video update', () => {
    const publication: WorkspacePublicationSummary = {
      kind: 'publication',
      id: 'video-update-1',
      deliveryId: 'delivery-video-1',
      senderDisplayName: 'Sparkle Suite',
      title: 'New video: Prepare your next show',
      summary: 'A practical preparation walkthrough.',
      body: 'Watch the new resource when you are ready.',
      category: 'video',
      actionLabel: 'Open in Resources & Help',
      actionUrl: '/nic-nac?section=resources&resource=show-prep',
      secondaryActionLabel: 'Watch on YouTube',
      secondaryActionUrl: 'https://www.youtube.com/watch?v=abc123',
      isRead: false,
      readAt: null,
      createdAt: '2026-09-13T12:00:00.000Z',
    }
    const html = renderToStaticMarkup(
      createElement(ConversationThread, {
        item: publication,
        detail: null,
        detailStatus: 'idle',
        actionPending: false,
        actionError: null,
        headingRef: createRef<HTMLHeadingElement>(),
        onBack: vi.fn(),
        onSendReply: vi.fn(),
        onRequestDecision: vi.fn(),
        onReport: vi.fn(),
        onBlock: vi.fn(),
        onArchive: vi.fn(),
        onMute: vi.fn(),
        onRetry: vi.fn(),
      }),
    )

    expect(html).toContain('Open in Resources &amp; Help')
    expect(html).toContain('href="/nic-nac?section=resources&amp;resource=show-prep"')
    expect(html).toContain('Watch on YouTube')
    expect(html).toContain('href="https://www.youtube.com/watch?v=abc123"')
  })

  it('renders authenticated private Support screenshots after a detail reload', () => {
    const item = REVIEW_INBOX_FIXTURES.find(
      (candidate) =>
        candidate.kind === 'conversation' &&
        candidate.conversationType === 'support',
    )!
    const detail = {
      ...REVIEW_CONVERSATION_DETAILS[item.id],
      attachments: [
        {
          id: '00000000-0000-4000-8000-000000000091',
          contentType: 'image/png',
          byteSize: 2400,
          width: 900,
          height: 600,
          slot: 1,
          createdAt: '2026-08-26T12:00:00.000Z',
          signedReadHref:
            '/api/nic-nac/conversations/00000000-0000-4000-8000-000000000001/attachments/00000000-0000-4000-8000-000000000091',
        },
      ],
    }
    const html = renderToStaticMarkup(
      createElement(ConversationThread, {
        item,
        detail,
        detailStatus: 'ready',
        actionPending: false,
        actionError: null,
        headingRef: createRef<HTMLHeadingElement>(),
        onBack: vi.fn(),
        onSendReply: vi.fn(),
        onRequestDecision: vi.fn(),
        onReport: vi.fn(),
        onBlock: vi.fn(),
        onArchive: vi.fn(),
        onMute: vi.fn(),
        onRetry: vi.fn(),
      }),
    )

    expect(html).toContain('Attached screenshots')
    expect(html).toContain('Loading private screenshot')
    expect(html).toContain('Visible only to you and Sparkle Suite Support')
    expect(html).not.toContain('workspace-support-attachments')
  })

  it('permits only Workspace-relative or approved Sparkle HTTPS links', () => {
    expect(getSafeMessageActionUrl('/nic-nac?section=trade-board')).toBe(
      '/nic-nac?section=trade-board',
    )
    expect(
      getSafeMessageActionUrl('https://www.yoursparklefinder.com/reps'),
    ).toBe('https://www.yoursparklefinder.com/reps')
    expect(getSafeMessageActionUrl('/api/private')).toBeNull()
    expect(getSafeMessageActionUrl('https://example.com/phish')).toBeNull()
    expect(
      getSafeMessageActionUrl('https://yoursparklesuite.com.evil.test/path'),
    ).toBeNull()
    expect(
      getSafeMessageActionUrl('https://user@yoursparklesuite.com/nic-nac'),
    ).toBeNull()
  })

  it('permits a direct action only for safe YouTube hosts', () => {
    expect(getSafeYouTubeActionUrl('https://youtu.be/abc123')).toBe(
      'https://youtu.be/abc123',
    )
    expect(getSafeYouTubeActionUrl('https://example.com/watch?v=abc123')).toBeNull()
    expect(getSafeYouTubeActionUrl('https://youtube.com.evil.test/watch?v=abc123')).toBeNull()
    expect(getSafeYouTubeActionUrl('javascript:alert(1)')).toBeNull()
  })

  it('keeps Support usable without exposing paid Message Center views', () => {
    const html = renderToStaticMarkup(
      createElement(MessageCenter, {
        state: {
          status: 'ready',
          inbox: { unreadCount: 4, messages: REVIEW_INBOX_FIXTURES },
        },
        actionState: { pendingKey: null, error: null, helperMessage: null },
        reviewMode: true,
        supportOnly: true,
        onUpdatePublication: vi.fn(),
        onRetry: vi.fn(),
      }),
    )

    expect(html).toContain('Contact Support')
    expect(html).toContain('>Support<')
    expect(html).not.toContain('>Team<')
    expect(html).not.toContain('>Rep Network<')
    expect(html).not.toContain('>Sparkle Suite<')
    expect(html).not.toContain('New message')
  })

  it('guides Support intake before revealing the short form', () => {
    const baseProps = {
      source: 'help',
      headingRef: createRef<HTMLHeadingElement>(),
      onCancel: vi.fn(),
      onSubmit: vi.fn(),
    }
    const choiceHtml = renderToStaticMarkup(
      createElement(SupportComposer, baseProps),
    )
    expect(choiceHtml).toContain('Ask for help')
    expect(choiceHtml).toContain('Report a problem')
    expect(choiceHtml).toContain('Share an idea')
    expect(choiceHtml).not.toContain('Short summary')

    const bugHtml = renderToStaticMarkup(
      createElement(SupportComposer, { ...baseProps, initialType: 'bug' }),
    )
    expect(bugHtml).toContain('Short summary')
    expect(bugHtml).toContain('What did you expect?')
    expect(bugHtml).toContain('What happened instead?')
    expect(bugHtml).toContain('Sending to Sparkle Suite Support')
    expect(bugHtml).toContain('Send to Support')
  })

  it('makes a pending Rep Network request an explicit choice with a reasoned report path', () => {
    const html = renderToStaticMarkup(
      createElement(RepMessageRequestCard, {
        senderName: "Mia's Gem Room",
        pending: false,
        onDecision: vi.fn(),
        onReport: vi.fn(),
      }),
    )
    expect(html).toContain('They cannot continue the conversation unless you accept.')
    expect(html).toContain('Accept')
    expect(html).toContain('Decline')
    expect(html).toContain('Decline and block')
    expect(html).toContain('Report')
  })

  it('retains idempotency keys across failed retries and uses dedicated safety routes', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'app/nic-nac/components/messages/useMessageCenter.ts',
      ),
      'utf8',
    )
    expect(source).toContain('sendRequestKeysRef.current.get(requestFingerprint)')
    expect(source).toContain('supportRequestKeysRef.current.get(requestFingerprint)')
    expect(source).toContain('repRequestKeysRef.current.get(requestFingerprint)')
    expect(source).toContain('sendRequestKeysRef.current.delete(requestFingerprint)')
    expect(source).toContain('/request-decision`')
    expect(source).toContain('/report`')
    expect(source).toContain('/block`')
  })

  it('synchronizes conversation read and archive changes with the workspace header badge', () => {
    const controllerSource = readFileSync(
      resolve(
        process.cwd(),
        'app/nic-nac/components/messages/useMessageCenter.ts',
      ),
      'utf8',
    )
    const dashboardSource = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/DashboardPlaceholder.tsx'),
      'utf8',
    )

    expect(controllerSource).toContain('onUpdateConversation?.(item, { unreadCount: 0 })')
    expect(controllerSource).toContain('onUpdateConversation?.(selectedItem, {')
    expect(dashboardSource).toContain('handleUpdateConversationSummary')
    expect(dashboardSource).toContain(
      'unreadCount: getActiveUnreadMessageCount(messages)',
    )
  })

  it('quietly refreshes Message Center every minute and when the Workspace becomes active', () => {
    const dashboardSource = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/DashboardPlaceholder.tsx'),
      'utf8',
    )

    expect(dashboardSource).toContain('const MESSAGE_CENTER_REFRESH_MS = 60_000')
    expect(dashboardSource).toContain('messagesRefreshInFlightRef')
    expect(dashboardSource).toContain("document.addEventListener('visibilitychange', refreshWhenVisible)")
    expect(dashboardSource).toContain("window.addEventListener('focus', refreshMessagesInBackground)")
    expect(dashboardSource).toContain('MESSAGE_CENTER_REFRESH_MS')
    expect(dashboardSource).toContain('.catch(() => undefined)')
  })

  it('uses one-surface-at-a-time phone layout, 44px controls, and reduced motion', () => {
    const css = readFileSync(
      resolve(
        process.cwd(),
        'app/nic-nac/components/messages/MessageCenter.module.css',
      ),
      'utf8',
    )
    expect(css).toContain('min-height: 44px')
    expect(css).toMatch(/@media \(max-width: 920px\)[\s\S]*?\.centerLayoutDetail \.inboxPane[\s\S]*?display: none/)
    expect(css).toMatch(/\.centerLayoutDetail \.detailPane[\s\S]*?display: block/)
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
  })
})
