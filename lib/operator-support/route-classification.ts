/**
 * Deny-by-default inventory for routes that are adjacent to the rep Workspace.
 *
 * A support-allowed classification authorizes only the explicit, audited
 * support-session gateway. It does not authorize the existing rep route to
 * accept a Control Center cookie. Existing routes keep their authentication
 * boundary and are invoked for a frozen target through request-local context.
 */

import type { SupportCapability } from './types'

export const OPERATOR_SUPPORT_ROUTE_CLASSIFICATIONS = [
  'support_allowed_read',
  'support_allowed_write',
  'support_blocked_sensitive',
  'rep_only',
  'not_applicable',
] as const

export type OperatorSupportRouteClassification =
  (typeof OPERATOR_SUPPORT_ROUTE_CLASSIFICATIONS)[number]

export const OPERATOR_SUPPORT_HTTP_METHODS = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
] as const

export type OperatorSupportHttpMethod =
  (typeof OPERATOR_SUPPORT_HTTP_METHODS)[number]

export type OperatorSupportCapabilityHint = SupportCapability

export type OperatorSupportRouteInventoryEntry = {
  /** Repository-relative route-handler file. */
  file: `app/api/${string}/route.${'ts' | 'js' | 'tsx' | 'jsx' | 'mts' | 'mjs'}`
  /** Next.js URL pattern. Dynamic segment names remain in brackets. */
  path: `/api/${string}`
  methods: readonly OperatorSupportHttpMethod[]
  /** Optional narrower method allowlist for the support gateway. */
  supportMethods?: readonly OperatorSupportHttpMethod[]
  classification: OperatorSupportRouteClassification
  /** Capability required by the future explicit support handler, if planned. */
  capabilities?: readonly OperatorSupportCapabilityHint[]
  rationale: string
}

/**
 * Roots guarded by the filesystem completeness test. Provider callbacks are
 * named explicitly so their trust boundary cannot be confused with a Workspace
 * route. The future support-session root is guarded before its first route is
 * added.
 */
export const OPERATOR_SUPPORT_ROUTE_INVENTORY_ROOTS = [
  'app/api/account',
  'app/api/auth',
  'app/api/control-center/support-sessions',
  'app/api/nic-nac',
  'app/api/self-serve',
  'app/api/stripe',
  'app/api/telegram',
  'app/api/telnyx',
] as const

export const OPERATOR_SUPPORT_ROUTE_INVENTORY_ADDITIONAL_FILES = [
  'app/api/workspace/live-lineup/route.ts',
] as const

export const OPERATOR_SUPPORT_PROVIDER_ROUTE_ROOTS = [
  'app/api/stripe',
  'app/api/telegram',
  'app/api/telnyx',
] as const

export const OPERATOR_SUPPORT_ROUTE_INVENTORY = [
  {
    file: 'app/api/workspace/live-lineup/route.ts',
    path: '/api/workspace/live-lineup',
    methods: ['GET', 'POST'],
    supportMethods: ['GET'],
    classification: 'support_allowed_read',
    capabilities: ['live_queue.view'],
    rationale: 'Shows the frozen target rep live queue for diagnosis without allowing support-mode reordering.',
  },
  {
    file: 'app/api/control-center/support-sessions/route.ts',
    path: '/api/control-center/support-sessions',
    methods: ['GET', 'POST'],
    classification: 'not_applicable',
    rationale: 'Creates and lists operator sessions behind the independent Control Center boundary.',
  },
  {
    file: 'app/api/control-center/support-sessions/[sessionId]/end/route.ts',
    path: '/api/control-center/support-sessions/[sessionId]/end',
    methods: ['POST'],
    classification: 'not_applicable',
    rationale: 'Closes the authenticated support session; it is not a target Workspace domain route.',
  },
  {
    file: 'app/api/control-center/support-sessions/[sessionId]/customers/route.ts',
    path: '/api/control-center/support-sessions/[sessionId]/customers',
    methods: ['GET'],
    classification: 'support_allowed_read',
    capabilities: ['customers.view'],
    rationale: 'Provides a separately implemented target-scoped customer view and audited CSV export.',
  },
  {
    file: 'app/api/control-center/support-sessions/[sessionId]/gateway/route.ts',
    path: '/api/control-center/support-sessions/[sessionId]/gateway',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    classification: 'not_applicable',
    rationale: 'Deny-by-default boundary that dispatches only separately classified target Workspace routes.',
  },
  {
    file: 'app/api/account/activate-trial/route.ts',
    path: '/api/account/activate-trial',
    methods: ['POST'],
    classification: 'support_blocked_sensitive',
    rationale: 'Changes account access/entitlement state.',
  },
  {
    file: 'app/api/auth/callback/route.ts',
    path: '/api/auth/callback',
    methods: ['GET'],
    classification: 'support_blocked_sensitive',
    rationale: 'Completes a Supabase Auth identity flow and must never accept support identity.',
  },
  {
    file: 'app/api/nic-nac/account-billing/route.ts',
    path: '/api/nic-nac/account-billing',
    methods: ['GET'],
    classification: 'support_allowed_read',
    capabilities: ['workspace.view'],
    rationale: 'Read-only billing status mirrors the rep Workspace; provider and billing mutations remain blocked.',
  },
  {
    file: 'app/api/nic-nac/calendar-summary/route.ts',
    path: '/api/nic-nac/calendar-summary',
    methods: ['GET'],
    classification: 'support_allowed_read',
    capabilities: ['calendar.view'],
    rationale: 'Calendar viewing is approved through an explicit target-scoped support route.',
  },
  {
    file: 'app/api/nic-nac/conversation-rollover/route.ts',
    path: '/api/nic-nac/conversation-rollover',
    methods: ['POST'],
    classification: 'rep_only',
    rationale: 'Ordinary rep conversation continuity stays isolated from the support-session conversation.',
  },
  {
    file: 'app/api/nic-nac/conversation-state/route.ts',
    path: '/api/nic-nac/conversation-state',
    methods: ['GET'],
    classification: 'support_allowed_read',
    capabilities: ['nic_nac.use'],
    rationale: 'Returns only the isolated support-session conversation when support context is active.',
  },
  {
    file: 'app/api/nic-nac/conversation/[conversationId]/route.ts',
    path: '/api/nic-nac/conversation/[conversationId]',
    methods: ['GET'],
    classification: 'rep_only',
    rationale: 'Ordinary rep Nic-Nac history stays isolated from the support-session conversation.',
  },
  {
    file: 'app/api/nic-nac/conversation/clear/route.ts',
    path: '/api/nic-nac/conversation/clear',
    methods: ['POST'],
    classification: 'support_allowed_write',
    capabilities: ['nic_nac.use'],
    rationale: 'Clears only the isolated support-session conversation with mutation audit.',
  },
  {
    file: 'app/api/nic-nac/conversation/latest/route.ts',
    path: '/api/nic-nac/conversation/latest',
    methods: ['GET'],
    classification: 'rep_only',
    rationale: 'Ordinary rep latest-conversation state is not support-session state.',
  },
  {
    file: 'app/api/nic-nac/conversation/rollover/route.ts',
    path: '/api/nic-nac/conversation/rollover',
    methods: ['POST'],
    classification: 'rep_only',
    rationale: 'Ordinary rep rollover must not affect the isolated support-session conversation.',
  },
  {
    file: 'app/api/nic-nac/conversations/[conversationId]/attachments/[attachmentId]/route.ts',
    path: '/api/nic-nac/conversations/[conversationId]/attachments/[attachmentId]',
    methods: ['GET'],
    classification: 'support_allowed_read',
    capabilities: ['messages.view'],
    rationale: 'Issues target-scoped signed access for an ordinary private conversation attachment.',
  },
  {
    file: 'app/api/nic-nac/conversations/[conversationId]/attachments/route.ts',
    path: '/api/nic-nac/conversations/[conversationId]/attachments',
    methods: ['POST'],
    classification: 'support_allowed_write',
    capabilities: ['messages.manage'],
    rationale: 'Uploads an attachment to the target rep conversation with operator audit.',
  },
  {
    file: 'app/api/nic-nac/conversations/[conversationId]/block/route.ts',
    path: '/api/nic-nac/conversations/[conversationId]/block',
    methods: ['POST'],
    classification: 'support_blocked_sensitive',
    rationale: 'Changes private Rep Network safety state as the rep.',
  },
  {
    file: 'app/api/nic-nac/conversations/[conversationId]/messages/route.ts',
    path: '/api/nic-nac/conversations/[conversationId]/messages',
    methods: ['POST'],
    classification: 'support_allowed_write',
    capabilities: ['messages.manage'],
    rationale: 'Sends an ordinary private message for the target rep with operator audit.',
  },
  {
    file: 'app/api/nic-nac/conversations/[conversationId]/report/route.ts',
    path: '/api/nic-nac/conversations/[conversationId]/report',
    methods: ['POST'],
    classification: 'support_blocked_sensitive',
    rationale: 'Creates a private Rep Network report attributed to the rep.',
  },
  {
    file: 'app/api/nic-nac/conversations/[conversationId]/request-decision/route.ts',
    path: '/api/nic-nac/conversations/[conversationId]/request-decision',
    methods: ['POST'],
    classification: 'support_allowed_write',
    capabilities: ['messages.manage'],
    rationale: 'Handles an ordinary target rep contact request with operator audit.',
  },
  {
    file: 'app/api/nic-nac/conversations/[conversationId]/route.ts',
    path: '/api/nic-nac/conversations/[conversationId]',
    methods: ['GET'],
    classification: 'support_allowed_read',
    capabilities: ['messages.view'],
    rationale: 'Reads the target rep private Support or Rep Network conversation.',
  },
  {
    file: 'app/api/nic-nac/conversations/[conversationId]/state/route.ts',
    path: '/api/nic-nac/conversations/[conversationId]/state',
    methods: ['PATCH'],
    classification: 'support_allowed_write',
    capabilities: ['messages.manage'],
    rationale: 'Changes ordinary read, archive, mute, or related state with operator audit.',
  },
  {
    file: 'app/api/nic-nac/conversations/rep-directory/route.ts',
    path: '/api/nic-nac/conversations/rep-directory',
    methods: ['GET'],
    classification: 'support_allowed_read',
    capabilities: ['messages.view'],
    rationale: 'Reads the target rep ordinary Rep Network directory.',
  },
  {
    file: 'app/api/nic-nac/conversations/rep-requests/route.ts',
    path: '/api/nic-nac/conversations/rep-requests',
    methods: ['POST'],
    classification: 'support_allowed_write',
    capabilities: ['messages.manage'],
    rationale: 'Initiates an ordinary Rep Network request for the target rep with audit.',
  },
  {
    file: 'app/api/nic-nac/conversations/support/route.ts',
    path: '/api/nic-nac/conversations/support',
    methods: ['POST'],
    classification: 'support_allowed_write',
    capabilities: ['messages.manage'],
    rationale: 'Creates an ordinary support submission for the target rep with operator audit.',
  },
  {
    file: 'app/api/nic-nac/customer-audience/route.ts',
    path: '/api/nic-nac/customer-audience',
    methods: ['GET', 'POST', 'PATCH'],
    classification: 'support_allowed_write',
    capabilities: ['customers.view', 'customers.manage'],
    rationale: 'Customer viewing, editing, import, consent updates, and CSV export are approved support work.',
  },
  {
    file: 'app/api/nic-nac/fulfillment-queue/route.ts',
    path: '/api/nic-nac/fulfillment-queue',
    methods: ['GET', 'POST'],
    classification: 'support_allowed_write',
    capabilities: ['inventory.view', 'inventory.manage'],
    rationale: 'Fulfillment viewing and normal workflow actions are approved with audit.',
  },
  {
    file: 'app/api/nic-nac/health/route.ts',
    path: '/api/nic-nac/health',
    methods: ['GET'],
    classification: 'not_applicable',
    rationale: 'Operational health does not read or mutate a target rep Workspace.',
  },
  {
    file: 'app/api/nic-nac/jewelry-library/route.ts',
    path: '/api/nic-nac/jewelry-library',
    methods: ['GET', 'POST'],
    classification: 'support_allowed_write',
    capabilities: ['inventory.view', 'inventory.manage'],
    rationale: 'Inventory library setup is an approved audited support workflow.',
  },
  {
    file: 'app/api/nic-nac/join-team-roster/route.ts',
    path: '/api/nic-nac/join-team-roster',
    methods: ['GET', 'POST'],
    classification: 'support_allowed_write',
    capabilities: ['team.view', 'team.manage'],
    rationale: 'Non-communication team roster setup is approved with audit.',
  },
  {
    file: 'app/api/nic-nac/join-team-roster/photo/route.ts',
    path: '/api/nic-nac/join-team-roster/photo',
    methods: ['POST'],
    classification: 'support_allowed_write',
    capabilities: ['team.manage'],
    rationale: 'Validated public team-card photo upload is approved with audit.',
  },
  {
    file: 'app/api/nic-nac/me/route.ts',
    path: '/api/nic-nac/me',
    methods: ['GET'],
    classification: 'support_allowed_read',
    capabilities: ['workspace.view'],
    rationale: 'Target Workspace identity is needed through a frozen support context route.',
  },
  {
    file: 'app/api/nic-nac/messages/route.ts',
    path: '/api/nic-nac/messages',
    methods: ['GET', 'PATCH', 'POST', 'PUT', 'DELETE'],
    classification: 'support_allowed_write',
    capabilities: ['messages.view', 'messages.manage'],
    rationale: 'Ordinary Message Center reads and actions are approved with target scope and audit.',
  },
  {
    file: 'app/api/nic-nac/resource-library/route.ts',
    path: '/api/nic-nac/resource-library',
    methods: ['GET'],
    classification: 'support_allowed_read',
    capabilities: ['workspace.view'],
    rationale: 'Shared learning resources remain available while assisting in the target Workspace.',
  },
  {
    file: 'app/api/nic-nac/resources/route.ts',
    path: '/api/nic-nac/resources',
    methods: ['GET'],
    classification: 'support_allowed_read',
    capabilities: ['workspace.view'],
    rationale: 'Shared resource content remains available while assisting in the target Workspace.',
  },
  {
    file: 'app/api/nic-nac/route.ts',
    path: '/api/nic-nac',
    methods: ['POST'],
    classification: 'support_allowed_write',
    capabilities: ['nic_nac.use'],
    rationale: 'Nic-Nac uses the frozen target rep context and the gateway records the operator request.',
  },
  {
    file: 'app/api/nic-nac/send-email/route.ts',
    path: '/api/nic-nac/send-email',
    methods: ['POST'],
    classification: 'support_allowed_write',
    capabilities: ['communications.manage'],
    rationale: 'Ordinary customer email is approved through the audited target-scoped gateway.',
  },
  {
    file: 'app/api/nic-nac/site-analytics/route.ts',
    path: '/api/nic-nac/site-analytics',
    methods: ['GET'],
    classification: 'support_allowed_read',
    capabilities: ['site.view'],
    rationale: 'Reads target customer-site analytics for troubleshooting.',
  },
  {
    file: 'app/api/nic-nac/site-recipes/draft/route.ts',
    path: '/api/nic-nac/site-recipes/draft',
    methods: ['POST'],
    classification: 'support_allowed_write',
    capabilities: ['site.manage'],
    rationale: 'Recipe drafting is approved customer-site setup work with audit.',
  },
  {
    file: 'app/api/nic-nac/site-recipes/image/route.ts',
    path: '/api/nic-nac/site-recipes/image',
    methods: ['POST'],
    classification: 'support_allowed_write',
    capabilities: ['site.manage'],
    rationale: 'Recipe image upload is approved customer-site setup work with safe file auditing.',
  },
  {
    file: 'app/api/nic-nac/site-recipes/route.ts',
    path: '/api/nic-nac/site-recipes',
    methods: ['GET', 'POST'],
    classification: 'support_allowed_write',
    capabilities: ['site.view', 'site.manage'],
    rationale: 'Recipe viewing and editing are approved customer-site support work.',
  },
  {
    file: 'app/api/nic-nac/site-settings/media/route.ts',
    path: '/api/nic-nac/site-settings/media',
    methods: ['POST'],
    classification: 'support_allowed_write',
    capabilities: ['site.manage'],
    rationale: 'Customer-site media setup is approved with existing file validation and audit.',
  },
  {
    file: 'app/api/nic-nac/site-settings/route.ts',
    path: '/api/nic-nac/site-settings',
    methods: ['GET', 'POST'],
    classification: 'support_allowed_write',
    capabilities: ['site.view', 'site.manage'],
    rationale: 'Customer-site settings are an explicitly approved support workflow.',
  },
  {
    file: 'app/api/nic-nac/support-reports/route.ts',
    path: '/api/nic-nac/support-reports',
    methods: ['POST'],
    classification: 'support_allowed_write',
    capabilities: ['messages.manage'],
    rationale: 'Creates an ordinary support report for the target rep with operator audit.',
  },
  {
    file: 'app/api/nic-nac/support-access-history/route.ts',
    path: '/api/nic-nac/support-access-history',
    methods: ['GET'],
    classification: 'support_allowed_read',
    capabilities: ['workspace.view'],
    rationale: 'Shows the target rep support-access transparency history while assisting them.',
  },
  {
    file: 'app/api/nic-nac/team-onboarding/participants/[participantId]/messages/route.ts',
    path: '/api/nic-nac/team-onboarding/participants/[participantId]/messages',
    methods: ['POST'],
    classification: 'support_allowed_write',
    capabilities: ['communications.manage'],
    rationale: 'Sends an ordinary team message for the target rep through the audited gateway.',
  },
  {
    file: 'app/api/nic-nac/team-onboarding/participants/[participantId]/route.ts',
    path: '/api/nic-nac/team-onboarding/participants/[participantId]',
    methods: ['PATCH'],
    classification: 'support_allowed_write',
    capabilities: ['team.manage'],
    rationale: 'Non-communication participant setup changes are approved with audit.',
  },
  {
    file: 'app/api/nic-nac/team-onboarding/participants/route.ts',
    path: '/api/nic-nac/team-onboarding/participants',
    methods: ['GET', 'POST'],
    classification: 'support_allowed_write',
    capabilities: ['team.view', 'team.manage'],
    rationale: 'Participant setup is approved; outbound participant messages are separately audited.',
  },
  {
    file: 'app/api/nic-nac/trade-board/route.ts',
    path: '/api/nic-nac/trade-board',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    classification: 'support_allowed_write',
    capabilities: ['inventory.view', 'inventory.manage'],
    rationale: 'Inventory listing setup and correction are approved with audit.',
  },
  {
    file: 'app/api/nic-nac/trade-history/route.ts',
    path: '/api/nic-nac/trade-history',
    methods: ['GET'],
    classification: 'support_allowed_read',
    capabilities: ['inventory.view'],
    rationale: 'Trade history is approved target-scoped support context.',
  },
  {
    file: 'app/api/nic-nac/trade-requests/[requestId]/reveal-screenshot/route.ts',
    path: '/api/nic-nac/trade-requests/[requestId]/reveal-screenshot',
    methods: ['GET'],
    classification: 'support_allowed_read',
    capabilities: ['inventory.view'],
    rationale: 'A target-owned trade reveal image may be needed for inventory troubleshooting.',
  },
  {
    file: 'app/api/nic-nac/trade-requests/route.ts',
    path: '/api/nic-nac/trade-requests',
    methods: ['GET', 'POST'],
    classification: 'support_allowed_write',
    capabilities: ['inventory.view', 'inventory.manage'],
    rationale: 'Normal trade-request workflow assistance is approved with audit.',
  },
  {
    file: 'app/api/nic-nac/trade-swap-cleanup/route.ts',
    path: '/api/nic-nac/trade-swap-cleanup',
    methods: ['GET'],
    classification: 'support_allowed_read',
    capabilities: ['inventory.view'],
    rationale: 'Reads the target rep cleanup queue without changing trade state.',
  },
  {
    file: 'app/api/nic-nac/wallet-summary/route.ts',
    path: '/api/nic-nac/wallet-summary',
    methods: ['GET'],
    classification: 'support_allowed_read',
    capabilities: ['workspace.view'],
    rationale: 'Read-only wallet status mirrors the rep Workspace; wallet funding and auto-recharge remain blocked.',
  },
  {
    file: 'app/api/self-serve/setup-state/route.ts',
    path: '/api/self-serve/setup-state',
    methods: ['GET'],
    classification: 'support_allowed_read',
    capabilities: ['workspace.view', 'live_queue.view'],
    rationale: 'Required setup state and existing Live Queue display code are approved target Workspace context.',
  },
  {
    file: 'app/api/self-serve/signup/route.ts',
    path: '/api/self-serve/signup',
    methods: ['POST'],
    classification: 'support_blocked_sensitive',
    rationale: 'Creates account/authentication and pricing-reservation state.',
  },
  {
    file: 'app/api/stripe/create-checkout/route.ts',
    path: '/api/stripe/create-checkout',
    methods: ['POST'],
    classification: 'support_blocked_sensitive',
    rationale: 'Creates a Stripe checkout and may cause a charge.',
  },
  {
    file: 'app/api/stripe/create-portal-session/route.ts',
    path: '/api/stripe/create-portal-session',
    methods: ['POST'],
    classification: 'support_blocked_sensitive',
    rationale: 'Creates access to the Stripe billing portal.',
  },
  {
    file: 'app/api/stripe/subscription-status/route.ts',
    path: '/api/stripe/subscription-status',
    methods: ['GET'],
    classification: 'support_blocked_sensitive',
    rationale: 'Reads subscription, pricing tier, and provider status.',
  },
  {
    file: 'app/api/stripe/sync/route.ts',
    path: '/api/stripe/sync',
    methods: ['POST'],
    classification: 'support_blocked_sensitive',
    rationale: 'Reads Stripe and mutates local subscription/entitlement state.',
  },
  {
    file: 'app/api/stripe/wallet/auto-recharge/route.ts',
    path: '/api/stripe/wallet/auto-recharge',
    methods: ['POST'],
    classification: 'support_blocked_sensitive',
    rationale: 'Changes automatic SMS wallet funding settings.',
  },
  {
    file: 'app/api/stripe/wallet/load/route.ts',
    path: '/api/stripe/wallet/load',
    methods: ['POST'],
    classification: 'support_blocked_sensitive',
    rationale: 'Purchases SMS wallet credit through Stripe.',
  },
  {
    file: 'app/api/stripe/webhook/route.ts',
    path: '/api/stripe/webhook',
    methods: ['POST'],
    classification: 'support_blocked_sensitive',
    rationale: 'Provider-signed billing callback; never a support-session endpoint.',
  },
  {
    file: 'app/api/telegram/route.ts',
    path: '/api/telegram',
    methods: ['POST'],
    classification: 'support_blocked_sensitive',
    rationale: 'External provider webhook that can drive outbound or operational behavior.',
  },
  {
    file: 'app/api/telnyx/webhook/route.ts',
    path: '/api/telnyx/webhook',
    methods: ['POST'],
    classification: 'support_blocked_sensitive',
    rationale: 'Provider-signed SMS callback containing customer communication state.',
  },
] as const satisfies readonly OperatorSupportRouteInventoryEntry[]

export function getOperatorSupportRouteClassification(path: string) {
  return OPERATOR_SUPPORT_ROUTE_INVENTORY.find((entry) => entry.path === path)
}

export function isOperatorSupportGatewayClassificationAllowed(
  classification: OperatorSupportRouteClassification | undefined,
) {
  return (
    classification === 'support_allowed_read' ||
    classification === 'support_allowed_write'
  )
}
