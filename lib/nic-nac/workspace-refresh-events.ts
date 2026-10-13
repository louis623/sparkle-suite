import type { UIMessage } from 'ai'

export const NIC_NAC_WORKSPACE_REFRESH_EVENT = 'nic-nac:workspace-refresh'

export type NicNacWorkspaceRefreshTopic = 'trade' | 'site' | 'calendar' | 'audience'

const TRADE_WRITE_TOOL_TYPES = new Set([
  'tool-add_listing',
  'tool-remove_listing',
  'tool-restore_listing',
  'tool-update_listing',
  'tool-approve_trade',
  'tool-approve_trade_swap',
  'tool-reject_trade',
  'tool-update_fulfillment_status',
])

const SITE_WRITE_TOOL_TYPES = new Set([
  'tool-update_banner_text',
  'tool-update_site_setting',
  'tool-update_streaming_links',
  'tool-manage_site_recipes',
])

const CALENDAR_WRITE_TOOL_TYPES = new Set([
  'tool-add_show',
  'tool-update_show',
  'tool-cancel_show',
  'tool-cancel_show_series',
  'tool-pause_show_series',
  'tool-skip_show_occurrence',
  'tool-start_show_session',
  'tool-end_show',
])

type ToolPartLike = {
  type?: string
  state?: string
  output?: unknown
}

export function getWorkspaceRefreshTopicsFromMessages(
  messages: UIMessage[],
): NicNacWorkspaceRefreshTopic[] {
  const topics = new Set<NicNacWorkspaceRefreshTopic>()

  for (const message of messages) {
    for (const part of message.parts ?? []) {
      if (isCustomerWorkspaceMutationPart(part as ToolPartLike)) topics.add('audience')
      if (isTradeWorkspaceMutationPart(part as ToolPartLike)) {
        topics.add('trade')
      }
      if (isSiteWorkspaceMutationPart(part as ToolPartLike)) {
        topics.add('site')
      }
      if (isCalendarWorkspaceMutationPart(part as ToolPartLike)) {
        topics.add('calendar')
      }
    }
  }

  return [...topics]
}

export function getWorkspaceRefreshPartKey(
  message: UIMessage,
  part: unknown,
  index: number,
) {
  const toolPart = part as ToolPartLike
  return `${message.id}:${index}:${toolPart.type ?? 'unknown'}:${toolPart.state ?? 'unknown'}`
}

export function isTradeWorkspaceMutationPart(part: ToolPartLike) {
  if (!part.type || !TRADE_WRITE_TOOL_TYPES.has(part.type)) return false
  if (part.state !== 'output-available') return false
  if (isToolErrorOutput(part.output)) return false

  if (part.type === 'tool-add_listing') {
    return addListingOutputMutatedBoard(part.output)
  }

  return true
}

export function isSiteWorkspaceMutationPart(part: ToolPartLike) {
  if (!part.type || !SITE_WRITE_TOOL_TYPES.has(part.type)) return false
  if (part.state !== 'output-available') return false
  if (isToolErrorOutput(part.output)) return false

  return true
}

export function isCalendarWorkspaceMutationPart(part: ToolPartLike) {
  if (!part.type || !CALENDAR_WRITE_TOOL_TYPES.has(part.type)) return false
  if (part.state !== 'output-available') return false
  if (isToolErrorOutput(part.output)) return false

  return true
}

function isToolErrorOutput(output: unknown) {
  return (
    typeof output === 'object' &&
    output !== null &&
    typeof (output as { code?: unknown }).code === 'string'
  )
}

function addListingOutputMutatedBoard(output: unknown) {
  if (typeof output !== 'object' || output === null) return false
  const result = output as {
    listingId?: unknown
    added?: unknown
    needsAction?: unknown
  }
  if (result.needsAction) return false
  if (typeof result.listingId === 'string' && result.listingId.length > 0) {
    return true
  }
  return Array.isArray(result.added) && result.added.length > 0
}

export function isCustomerWorkspaceMutationPart(part: ToolPartLike) {
 return part.type === 'tool-manage_customer_contact' && part.state === 'output-available' && !isToolErrorOutput(part.output) && !!part.output
}
