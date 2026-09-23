import { describe, expect, it } from 'vitest'
import {
  assertWorkspaceConversationComposingEnabled,
  isWorkspaceConversationComposingEnabled,
} from '@/lib/services/workspace-conversation-feature-flags'

describe('workspace conversation composing feature flags', () => {
  it('keeps all conversation types enabled unless an operator explicitly disables one', () => {
    expect(isWorkspaceConversationComposingEnabled('team_onboarding', {})).toBe(true)
    expect(isWorkspaceConversationComposingEnabled('support', {})).toBe(true)
    expect(isWorkspaceConversationComposingEnabled('rep_direct', {})).toBe(true)
    expect(isWorkspaceConversationComposingEnabled('owner_direct', {})).toBe(true)
  })

  it('supports an independent emergency stop for each composing path', () => {
    expect(isWorkspaceConversationComposingEnabled('team_onboarding', {
      SPARKLE_WORKSPACE_TEAM_CONVERSATIONS_ENABLED: 'false',
    })).toBe(false)
    expect(isWorkspaceConversationComposingEnabled('support', {
      SPARKLE_WORKSPACE_SUPPORT_CONVERSATIONS_ENABLED: ' FALSE ',
    })).toBe(false)
    expect(isWorkspaceConversationComposingEnabled('rep_direct', {
      SPARKLE_WORKSPACE_REP_NETWORK_MESSAGING_ENABLED: 'false',
    })).toBe(false)
    expect(isWorkspaceConversationComposingEnabled('owner_direct', {
      SPARKLE_WORKSPACE_OWNER_DIRECT_MESSAGING_ENABLED: 'false',
    })).toBe(false)
  })

  it('throws a bounded service error while leaving reads unaffected', () => {
    expect(() => assertWorkspaceConversationComposingEnabled('support', {
      SPARKLE_WORKSPACE_SUPPORT_CONVERSATIONS_ENABLED: 'false',
    })).toThrowError(expect.objectContaining({
      code: 'CONVERSATION_COMPOSING_DISABLED',
      statusCode: 503,
    }))
  })
})
