export type ControlCenterCommunicationView =
  | 'support'
  | 'direct'
  | 'broadcasts'
  | 'safety'
  | 'approvals'

export type OperatorSupportReport = {
  id: string
  status: 'open' | 'reviewing' | 'planned' | 'resolved' | 'closed'
  reportType: string
  urgency: string
  title: string
  details?: string | null
  pageOrWorkflow?: string | null
  auditStatus?: string | null
  createdAt: string
  clientSnapshot?: Record<string, unknown> | null
  supportAudits?: Array<Record<string, unknown>>
  taskId?: string | null
}

export type OperatorConversationSummary = {
  id: string
  type: 'team' | 'support' | 'rep_network'
  state: string
  subject: string
  updatedAt: string
  unreadCount?: number
  participantLabels?: string[]
  latestMessagePreview?: string | null
  reportedCount?: number
  supportReport?: OperatorSupportReport | null
}

export type OperatorConversationMessage = {
  id: string
  senderType: string
  senderLabel: string
  body: string
  createdAt: string
  kind?: string
  isInternal?: boolean
}

export type OperatorConversationAttachment = {
  id: string
  contentType: 'image/jpeg' | 'image/png' | 'image/webp'
  byteSize: number
  width: number
  height: number
  slot: number
  createdAt: string
  signedReadHref: string
}

export type OperatorConversationDetail = {
  conversation: OperatorConversationSummary
  messages: OperatorConversationMessage[]
  attachments?: OperatorConversationAttachment[]
  supportReport?: OperatorSupportReport | null
  reports?: Array<{
    id: string
    reason: string
    details?: string | null
    status: string
    messageId?: string | null
    reporterLabel?: string | null
    createdAt: string
  }>
}

export function humanizeCommunicationValue(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function formatCommunicationDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'
  return date.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export async function readCommunicationResponse(response: Response) {
  const body = (await response.json().catch(() => null)) as
    | Record<string, unknown>
    | null
  if (!response.ok) {
    throw new Error(
      typeof body?.error === 'string'
        ? body.error
        : 'The communication request could not be completed.',
    )
  }
  return body ?? {}
}
