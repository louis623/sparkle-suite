import 'server-only'
import { ServiceError } from '@/lib/services/errors'
import type { WorkspaceConversationType } from '@/lib/services/workspace-conversation-permissions'

const FLAG_BY_TYPE: Record<WorkspaceConversationType, string> = {
  team_onboarding: 'SPARKLE_WORKSPACE_TEAM_CONVERSATIONS_ENABLED',
  support: 'SPARKLE_WORKSPACE_SUPPORT_CONVERSATIONS_ENABLED',
  rep_direct: 'SPARKLE_WORKSPACE_REP_NETWORK_MESSAGING_ENABLED',
  owner_direct: 'SPARKLE_WORKSPACE_OWNER_DIRECT_MESSAGING_ENABLED',
}

export function isWorkspaceConversationComposingEnabled(
  type: WorkspaceConversationType,
  env: Record<string, string | undefined> = process.env,
) {
  return env[FLAG_BY_TYPE[type]]?.trim().toLowerCase() !== 'false'
}

export function assertWorkspaceConversationComposingEnabled(
  type: WorkspaceConversationType,
  env?: Record<string, string | undefined>,
) {
  if (isWorkspaceConversationComposingEnabled(type, env)) return
  throw new ServiceError({
    code: 'CONVERSATION_COMPOSING_DISABLED',
    message: `${type} composing is disabled by an operator feature flag`,
    userMessage: 'New messages in this area are temporarily paused. Your existing history is still available.',
    statusCode: 503,
  })
}
