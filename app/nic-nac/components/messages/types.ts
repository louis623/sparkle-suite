export type WorkspaceMessageBodyBlock = {
  type: 'paragraph' | 'heading' | 'metric' | 'list'
  text?: string
  label?: string
  value?: string | number
  items?: string[]
}

export type WorkspacePublicationSummary = {
  kind?: 'publication'
  id: string
  deliveryId?: string
  publicationId?: string
  senderDisplayName?: string
  title?: string | null
  subject?: string | null
  summary?: string | null
  body: string | WorkspaceMessageBodyBlock[]
  category?: string | null
  priority?: string | null
  actionLabel?: string | null
  actionUrl?: string | null
  secondaryActionLabel?: string | null
  secondaryActionUrl?: string | null
  deliveredAt?: string
  createdAt?: string
  messageType?: string
  direction?: string
  isRead: boolean
  readAt: string | null
  archivedAt?: string | null
  isArchived?: boolean
}

export type WorkspaceConversationType =
  | 'team_onboarding'
  | 'support'
  | 'rep_direct'

export type WorkspaceConversationState =
  | 'pending'
  | 'open'
  | 'resolved'
  | 'closed'
  | 'blocked'

export type WorkspaceConversationContext = {
  label?: string | null
  value?: string | null
  href?: string | null
  source?: string | null
}

export type WorkspaceConversationSummary = {
  kind: 'conversation'
  id: string
  conversationId?: string
  conversationType: WorkspaceConversationType
  state: WorkspaceConversationState
  subject: string
  senderDisplayName: string
  senderSubtitle?: string | null
  latestMessagePreview?: string | null
  lastMessageAt?: string | null
  createdAt?: string | null
  unreadCount: number
  isRead?: boolean
  readAt?: string | null
  archivedAt?: string | null
  mutedAt?: string | null
  priority?: string | null
  context?: WorkspaceConversationContext | null
  requestDirection?: 'incoming' | 'outgoing' | null
  requestState?: 'pending' | 'accepted' | 'declined' | 'blocked' | null
}

export type WorkspaceInboxItem =
  | WorkspacePublicationSummary
  | WorkspaceConversationSummary

export type ConversationMessage = {
  id: string
  body: string
  kind: 'message' | 'system_status' | 'moderation_notice'
  senderType: 'rep' | 'onboarding_guest' | 'support' | 'system'
  senderDisplayName: string
  createdAt: string
  isOwn?: boolean
  deliveryState?: 'sending' | 'sent' | 'failed'
}

export type WorkspaceConversationAttachment = {
  id: string
  contentType: string
  byteSize: number
  width: number
  height: number
  slot: number
  createdAt: string
  signedReadHref: string
}

export type WorkspaceConversationDetail = WorkspaceConversationSummary & {
  messages: ConversationMessage[]
  attachments: WorkspaceConversationAttachment[]
  canReply: boolean
  canArchive?: boolean
  canMute?: boolean
  canClose?: boolean
  canReport?: boolean
}

export type MessageCenterInbox = {
  unreadCount: number
  messages: WorkspaceInboxItem[]
  items?: WorkspaceInboxItem[]
  nextCursor?: string | null
}

export type MessageCenterState = {
  status: 'loading' | 'ready' | 'error'
  inbox?: MessageCenterInbox
}

export type MessageCenterActionState = {
  pendingKey: string | null
  error: string | null
  helperMessage: string | null
}

export type MessageCenterView =
  | 'all'
  | 'team'
  | 'rep-network'
  | 'support'
  | 'sparkle-suite'
  | 'archived'

export type SparkleSuiteFilter = 'all' | 'reports' | 'resources' | 'updates'

export type SupportMessageType = 'question' | 'bug' | 'idea'

export type SupportDraft = {
  type: SupportMessageType | null
  summary: string
  details: string
  expectedResult: string
  actualResult: string
  urgency: 'normal' | 'blocking' | 'showtime_urgent'
  screenshots: File[]
  source: string | null
}

export type RepDirectoryOption = {
  repId: string
  displayName: string
  businessName: string
  contextLabel?: string | null
}

export type RepReportReason =
  | 'spam'
  | 'harassment'
  | 'recruiting'
  | 'unsafe'
  | 'other'

export type RepReportInput = {
  reason: RepReportReason
  details: string
}

export function isConversationItem(
  item: WorkspaceInboxItem,
): item is WorkspaceConversationSummary {
  return item.kind === 'conversation'
}

export function getInboxItems(inbox?: MessageCenterInbox) {
  return inbox?.items ?? inbox?.messages ?? []
}
