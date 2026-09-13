import { ServiceError } from '@/lib/services/errors'

export const WORKSPACE_MESSAGE_CATEGORIES = [
  'account_activity',
  'customer_activity',
  'business_update',
  'monthly_report',
  'platform_update',
  'help_update',
  'blog',
  'video',
  'announcement',
] as const

export const WORKSPACE_MESSAGE_PRIORITIES = [
  'normal',
  'important',
  'action_required',
] as const

export type WorkspaceMessageCategory =
  (typeof WORKSPACE_MESSAGE_CATEGORIES)[number]
export type WorkspaceMessagePriority =
  (typeof WORKSPACE_MESSAGE_PRIORITIES)[number]
export type WorkspaceMessageAudienceKind = 'all_active' | 'selected'
export type WorkspaceMessageBody = Array<{
  type: 'paragraph' | 'heading' | 'metric' | 'list'
  text?: string
  label?: string
  value?: string | number
  items?: string[]
}>

export interface WorkspaceMessageSenderRecord {
  id: string
  senderKey: string
  displayName: string
  senderType: 'owner' | 'agent' | 'automation' | 'legacy'
  capabilities: {
    categories: WorkspaceMessageCategory[]
    audiences: WorkspaceMessageAudienceKind[]
  }
  isActive: boolean
}

type SenderRow = {
  id: string
  sender_key: string
  display_name: string
  sender_type: WorkspaceMessageSenderRecord['senderType']
  capabilities: unknown
  is_active: boolean
}

function messageError(
  code: string,
  message: string,
  statusCode = 400,
): ServiceError {
  return new ServiceError({ code, message, userMessage: message, statusCode })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeCapabilities(
  value: unknown,
): WorkspaceMessageSenderRecord['capabilities'] {
  const record = isRecord(value) ? value : {}
  const categories = Array.isArray(record.categories)
    ? record.categories.filter((candidate): candidate is WorkspaceMessageCategory =>
        WORKSPACE_MESSAGE_CATEGORIES.includes(
          candidate as WorkspaceMessageCategory,
        ),
      )
    : []
  const audiences = Array.isArray(record.audiences)
    ? record.audiences.filter(
        (candidate): candidate is WorkspaceMessageAudienceKind =>
          candidate === 'all_active' || candidate === 'selected',
      )
    : []
  return { categories, audiences }
}

export function mapWorkspaceMessageSender(
  row: SenderRow,
): WorkspaceMessageSenderRecord {
  return {
    id: row.id,
    senderKey: row.sender_key,
    displayName: row.display_name,
    senderType: row.sender_type,
    capabilities: normalizeCapabilities(row.capabilities),
    isActive: row.is_active,
  }
}

export function assertWorkspaceMessageSenderCanPublish(
  sender: WorkspaceMessageSenderRecord,
  category: WorkspaceMessageCategory,
  audienceKind: WorkspaceMessageAudienceKind,
) {
  if (!sender.isActive) {
    throw messageError(
      'WORKSPACE_MESSAGE_SENDER_INACTIVE',
      'This Message Center sender is inactive.',
      403,
    )
  }
  if (!sender.capabilities.categories.includes(category)) {
    throw messageError(
      'WORKSPACE_MESSAGE_CATEGORY_FORBIDDEN',
      `Sender ${sender.senderKey} cannot publish ${category} messages.`,
      403,
    )
  }
  if (!sender.capabilities.audiences.includes(audienceKind)) {
    throw messageError(
      'WORKSPACE_MESSAGE_AUDIENCE_FORBIDDEN',
      `Sender ${sender.senderKey} cannot publish to ${audienceKind} audiences.`,
      403,
    )
  }
}

export function requireAutomationIdempotencyKey(
  sender: WorkspaceMessageSenderRecord,
  idempotencyKey: string | null,
) {
  if (sender.senderType !== 'automation') return
  if (!idempotencyKey) {
    throw messageError(
      'WORKSPACE_MESSAGE_IDEMPOTENCY_REQUIRED',
      'Automated Message Center publications require an idempotency key.',
    )
  }
}

function assertSafeText(value: string, field: string, maxLength: number) {
  const trimmed = value.trim()
  if (!trimmed) {
    throw messageError(
      'WORKSPACE_MESSAGE_INVALID_CONTENT',
      `${field} is required.`,
    )
  }
  if (trimmed.length > maxLength) {
    throw messageError(
      'WORKSPACE_MESSAGE_INVALID_CONTENT',
      `${field} must be ${maxLength} characters or fewer.`,
    )
  }
  if (
    /<\s*\/?\s*(script|iframe|object|embed|style|link|meta)\b/i.test(trimmed) ||
    /\bon\w+\s*=/i.test(trimmed) ||
    /javascript\s*:/i.test(trimmed)
  ) {
    throw messageError(
      'WORKSPACE_MESSAGE_UNSAFE_CONTENT',
      `${field} contains executable markup and cannot be published.`,
      422,
    )
  }
  return trimmed
}

export function normalizeWorkspaceMessageBody(
  value: WorkspaceMessageBody | string,
): WorkspaceMessageBody {
  if (typeof value === 'string') {
    return [{ type: 'paragraph', text: assertSafeText(value, 'Body', 20_000) }]
  }
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) {
    throw messageError(
      'WORKSPACE_MESSAGE_INVALID_CONTENT',
      'Body must contain between 1 and 100 content blocks.',
    )
  }

  return value.map((block, index) => {
    if (!isRecord(block)) {
      throw messageError(
        'WORKSPACE_MESSAGE_INVALID_CONTENT',
        `Body block ${index + 1} is invalid.`,
      )
    }
    if (
      block.type !== 'paragraph' &&
      block.type !== 'heading' &&
      block.type !== 'metric' &&
      block.type !== 'list'
    ) {
      throw messageError(
        'WORKSPACE_MESSAGE_INVALID_CONTENT',
        `Body block ${index + 1} uses an unsupported type.`,
      )
    }
    if ('html' in block || 'rawHtml' in block || 'dangerouslySetInnerHTML' in block) {
      throw messageError(
        'WORKSPACE_MESSAGE_UNSAFE_CONTENT',
        'Raw HTML is not supported in Message Center content.',
        422,
      )
    }

    if (block.type === 'paragraph' || block.type === 'heading') {
      return {
        type: block.type,
        text: assertSafeText(
          typeof block.text === 'string' ? block.text : '',
          `Body block ${index + 1}`,
          5_000,
        ),
      }
    }
    if (block.type === 'metric') {
      const value = block.value
      if (typeof value !== 'string' && typeof value !== 'number') {
        throw messageError(
          'WORKSPACE_MESSAGE_INVALID_CONTENT',
          `Metric block ${index + 1} requires a value.`,
        )
      }
      return {
        type: 'metric' as const,
        label: assertSafeText(
          typeof block.label === 'string' ? block.label : '',
          `Metric label ${index + 1}`,
          160,
        ),
        value:
          typeof value === 'string'
            ? assertSafeText(value, `Metric value ${index + 1}`, 500)
            : value,
      }
    }

    if (!Array.isArray(block.items) || block.items.length === 0 || block.items.length > 100) {
      throw messageError(
        'WORKSPACE_MESSAGE_INVALID_CONTENT',
        `List block ${index + 1} must contain between 1 and 100 items.`,
      )
    }
    return {
      type: 'list' as const,
      items: block.items.map((item, itemIndex) =>
        assertSafeText(
          typeof item === 'string' ? item : '',
          `List item ${itemIndex + 1}`,
          1_000,
        ),
      ),
    }
  })
}

export function normalizeWorkspaceMessageText(input: {
  title: string
  summary?: string | null
  actionLabel?: string | null
}) {
  return {
    title: assertSafeText(input.title, 'Title', 160),
    summary:
      input.summary == null || input.summary.trim() === ''
        ? null
        : assertSafeText(input.summary, 'Summary', 500),
    actionLabel: normalizeWorkspaceMessageActionLabel(input.actionLabel),
  }
}

export function normalizeWorkspaceMessageActionLabel(value?: string | null) {
  return value == null || value.trim() === ''
    ? null
    : assertSafeText(value, 'Action label', 80)
}

export function normalizeWorkspaceMessageActionUrl(
  value?: string | null,
): string | null {
  if (value == null || value.trim() === '') return null
  const trimmed = value.trim()
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    throw messageError(
      'WORKSPACE_MESSAGE_INVALID_ACTION_URL',
      'Action links must be an internal path or a valid HTTPS URL.',
    )
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
    throw messageError(
      'WORKSPACE_MESSAGE_INVALID_ACTION_URL',
      'Action links must be an internal path or a valid HTTPS URL.',
    )
  }
  return parsed.toString()
}

export function assertWorkspaceMessageCategory(
  value: string,
): asserts value is WorkspaceMessageCategory {
  if (!WORKSPACE_MESSAGE_CATEGORIES.includes(value as WorkspaceMessageCategory)) {
    throw messageError(
      'WORKSPACE_MESSAGE_INVALID_CATEGORY',
      'Message category is invalid.',
    )
  }
}

export function assertWorkspaceMessagePriority(
  value: string,
): asserts value is WorkspaceMessagePriority {
  if (!WORKSPACE_MESSAGE_PRIORITIES.includes(value as WorkspaceMessagePriority)) {
    throw messageError(
      'WORKSPACE_MESSAGE_INVALID_PRIORITY',
      'Message priority is invalid.',
    )
  }
}
