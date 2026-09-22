import { describe, expect, it } from 'vitest'
import { ServiceError } from '@/lib/services/errors'
import {
  assertWorkspaceMessageSenderCanPublish,
  normalizeWorkspaceMessageActionUrl,
  normalizeWorkspaceMessageBody,
  normalizeWorkspaceMessageText,
  requireAutomationIdempotencyKey,
  type WorkspaceMessageSenderRecord,
} from '@/lib/services/workspace-message-permissions'

const automationSender: WorkspaceMessageSenderRecord = {
  id: 'sender-1',
  senderKey: 'customer_signup_notifier',
  displayName: 'Sparkle Suite',
  senderType: 'automation',
  capabilities: {
    categories: ['customer_activity'],
    audiences: ['selected'],
  },
  isActive: true,
}

describe('workspace message sender and content permissions', () => {
  it('allows only capability-scoped category and audience combinations', () => {
    expect(() =>
      assertWorkspaceMessageSenderCanPublish(
        automationSender,
        'customer_activity',
        'selected',
      ),
    ).not.toThrow()
    expect(() =>
      assertWorkspaceMessageSenderCanPublish(
        automationSender,
        'announcement',
        'selected',
      ),
    ).toThrowError(
      expect.objectContaining({ code: 'WORKSPACE_MESSAGE_CATEGORY_FORBIDDEN' }),
    )
    expect(() =>
      assertWorkspaceMessageSenderCanPublish(
        automationSender,
        'customer_activity',
        'all_active',
      ),
    ).toThrowError(
      expect.objectContaining({ code: 'WORKSPACE_MESSAGE_AUDIENCE_FORBIDDEN' }),
    )
  })

  it('requires every automation to supply an idempotency key', () => {
    expect(() => requireAutomationIdempotencyKey(automationSender, null)).toThrowError(
      expect.objectContaining({ code: 'WORKSPACE_MESSAGE_IDEMPOTENCY_REQUIRED' }),
    )
    expect(() =>
      requireAutomationIdempotencyKey(
        { ...automationSender, senderType: 'owner' },
        null,
      ),
    ).not.toThrow()
  })

  it('normalizes plain text into safe structured blocks', () => {
    expect(normalizeWorkspaceMessageBody(' Welcome to this month. ')).toEqual([
      { type: 'paragraph', text: 'Welcome to this month.' },
    ])
    expect(
      normalizeWorkspaceMessageBody([
        { type: 'heading', text: 'At a glance' },
        { type: 'metric', label: 'New customers', value: 4 },
        { type: 'list', items: ['First', 'Second'] },
      ]),
    ).toHaveLength(3)
  })

  it('accepts birthday report link lists only for internal Nic-Nac destinations', () => {
    expect(
      normalizeWorkspaceMessageBody([
        {
          type: 'link_list',
          links: [{ label: 'Jamie — Today · Sunday, September 22', href: '/nic-nac?section=customer-list&customer=customer-1' }],
        },
      ]),
    ).toEqual([
      {
        type: 'link_list',
        links: [{ label: 'Jamie — Today · Sunday, September 22', href: '/nic-nac?section=customer-list&customer=customer-1' }],
      },
    ])
    expect(() =>
      normalizeWorkspaceMessageBody([
        { type: 'link_list', links: [{ label: 'Unsafe', href: 'https://attacker.example' }] },
      ]),
    ).toThrowError(expect.objectContaining({ code: 'WORKSPACE_MESSAGE_INVALID_ACTION_URL' }))
  })

  it.each([
    '<script>alert(1)</script>',
    '<iframe src="https://bad.example"></iframe>',
    '<img src=x onerror=alert(1)>',
    'javascript:alert(1)',
  ])('rejects executable markup in message content: %s', (unsafe) => {
    expect(() => normalizeWorkspaceMessageBody(unsafe)).toThrowError(
      expect.objectContaining({ code: 'WORKSPACE_MESSAGE_UNSAFE_CONTENT' }),
    )
  })

  it('rejects raw HTML body blocks even when nested in structured content', () => {
    expect(() =>
      normalizeWorkspaceMessageBody([
        { type: 'paragraph', text: 'Safe', rawHtml: '<b>unsafe</b>' },
      ] as never),
    ).toThrowError(
      expect.objectContaining({ code: 'WORKSPACE_MESSAGE_UNSAFE_CONTENT' }),
    )
  })

  it('accepts internal and HTTPS actions but rejects unsafe schemes and protocol-relative URLs', () => {
    expect(normalizeWorkspaceMessageActionUrl('/nic-nac?section=customers')).toBe(
      '/nic-nac?section=customers',
    )
    expect(normalizeWorkspaceMessageActionUrl('https://example.com/watch')).toBe(
      'https://example.com/watch',
    )
    for (const unsafe of [
      'http://example.com',
      'javascript:alert(1)',
      '//attacker.example/path',
      'ftp://example.com/file',
    ]) {
      expect(() => normalizeWorkspaceMessageActionUrl(unsafe)).toThrow(ServiceError)
    }
  })

  it('enforces title and summary limits before database writes', () => {
    expect(() =>
      normalizeWorkspaceMessageText({ title: ' ', summary: 'ok' }),
    ).toThrowError(
      expect.objectContaining({ code: 'WORKSPACE_MESSAGE_INVALID_CONTENT' }),
    )
    expect(() =>
      normalizeWorkspaceMessageText({ title: 'ok', summary: 'x'.repeat(501) }),
    ).toThrowError(
      expect.objectContaining({ code: 'WORKSPACE_MESSAGE_INVALID_CONTENT' }),
    )
  })
})
