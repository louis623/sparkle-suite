import type { ReactNode } from 'react'
import { ListingPreview } from './ListingPreview'
import styles from './HITLBlock.module.css'

// Per-tool copy. Mirrors the set of tools that declare needsApproval:true in
// lib/nic-nac/tools/*. reject_trade is intentionally absent — it's not a HITL
// tool. Both confirm buttons keep the destructive-red style to match the
// system-prompt contract in lib/nic-nac/system-prompt.ts.
export const APPROVAL_COPY: Record<
  string,
  { title: ReactNode; confirm: string; cancel: string }
> = {
  approve_trade: {
    title: 'Approve this swap?',
    confirm: 'Approve swap',
    cancel: 'Cancel',
  },
  approve_trade_swap: {
    title: 'Approve this swap?',
    confirm: 'Approve swap',
    cancel: 'Cancel',
  },
  remove_listing: {
    title: 'Remove this listing from your board?',
    confirm: 'Remove listing',
    cancel: 'Cancel',
  },
  report_jewelry_catalog_issue: {
    title: 'Update this design for every rep?',
    confirm: 'Update catalog',
    cancel: 'Cancel',
  },
  cancel_show: {
    title: 'Cancel this show?',
    confirm: 'Cancel show',
    cancel: 'Keep show',
  },
  skip_show_occurrence: {
    title: 'Skip this show only?',
    confirm: 'Skip show',
    cancel: 'Keep show',
  },
  cancel_show_series: {
    title: 'Cancel this recurring series going forward?',
    confirm: 'Cancel future shows',
    cancel: 'Keep series',
  },
  pause_show_series: {
    title: 'Pause this recurring series?',
    confirm: 'Pause shows',
    cancel: 'Keep series',
  },
  set_notification_preferences: {
    title: 'Save these reminder preferences?',
    confirm: 'Save preferences',
    cancel: 'Cancel',
  },
  set_show_reminder_override: {
    title: 'Save reminder settings for this show?',
    confirm: 'Save show reminder',
    cancel: 'Cancel',
  },
  manage_customer_contact: {
    title: 'Save this customer contact change?',
    confirm: 'Save customer',
    cancel: 'Cancel',
  },
}

const FALLBACK_COPY = {
  title: 'Approve this action?',
  confirm: 'Approve',
  cancel: 'Cancel',
}

type ApprovalCopy = {
  title: ReactNode
  detail?: string
  confirm: string
  cancel: string
}

function valueAsString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function formatChannels(value: unknown) {
  if (!Array.isArray(value)) return null
  const channels = value
    .filter((channel): channel is string => typeof channel === 'string')
    .map((channel) => channel.toUpperCase())
  return channels.length ? channels.join(' + ') : null
}

function reminderDetail(args: Record<string, unknown>, scope: 'default' | 'show') {
  const bits: string[] = []
  const enabled = typeof args.enabled === 'boolean' ? args.enabled : null
  const channels = formatChannels(args.channels)
  const leadMinutes =
    typeof args.leadMinutes === 'number' ? `${args.leadMinutes} min before` : null

  if (enabled !== null) bits.push(enabled ? 'Reminders on' : 'Reminders off')
  if (channels) bits.push(channels)
  if (leadMinutes) bits.push(leadMinutes)
  if (args.includeDiscountCodes === false) bits.push('Hide codes')
  if (args.includeFeaturedCollections === false) bits.push('Hide collections')

  const eventId = valueAsString(args.eventId)
  if (scope === 'show' && eventId) bits.unshift(`Show ${eventId.slice(0, 8)}`)

  return bits.length ? bits.join(' - ') : undefined
}

export function getApprovalCopy(
  toolName: string,
  args: Record<string, unknown> = {},
): ApprovalCopy {
  const copy = APPROVAL_COPY[toolName] ?? FALLBACK_COPY
  const eventId = valueAsString(args.eventId)
  const reason = valueAsString(args.reason)
  const pauseUntil = valueAsString(args.pauseUntil)

  if (toolName === 'skip_show_occurrence') {
    return {
      ...copy,
      detail: [
        eventId ? `Show ${eventId.slice(0, 8)}` : null,
        reason ? `Reason: ${reason}` : null,
        'Only this occurrence will be skipped.',
      ].filter(Boolean).join(' - '),
    }
  }

  if (toolName === 'cancel_show_series') {
    return {
      ...copy,
      detail: [
        eventId ? `Series from show ${eventId.slice(0, 8)}` : null,
        reason ? `Reason: ${reason}` : null,
        'Future scheduled occurrences will be cancelled.',
      ].filter(Boolean).join(' - '),
    }
  }

  if (toolName === 'pause_show_series') {
    return {
      ...copy,
      detail: [
        eventId ? `Series from show ${eventId.slice(0, 8)}` : null,
        pauseUntil ? `Pause through ${pauseUntil}` : null,
        reason ? `Reason: ${reason}` : null,
      ].filter(Boolean).join(' - '),
    }
  }

  if (toolName === 'set_notification_preferences') {
    return {
      ...copy,
      detail: reminderDetail(args, 'default'),
    }
  }

  if (toolName === 'set_show_reminder_override') {
    return {
      ...copy,
      detail: reminderDetail(args, 'show'),
    }
  }

  return copy
}

export function HITLBlock({
  approvalId,
  toolName,
  args,
  onRespond,
}: {
  approvalId: string
  toolName: string
  args: Record<string, unknown>
  onRespond: (approved: boolean) => void
}) {
  const copy = getApprovalCopy(toolName, args)

  // remove_listing renders a compact preview of the target listing above the
  // question. The model passes listingId or itemNumber; designName is rarely
  // available here, so we synthesize a label from whatever's present.
  const showListingPreview = toolName === 'remove_listing'
  const designName =
    (args.designName as string | undefined) ??
    (args.itemNumber ? `Item ${args.itemNumber}` : 'this listing')
  const itemNumber = args.itemNumber as string | undefined

  return (
    <div className={styles.block}>
      {showListingPreview ? (
        <ListingPreview designName={designName} itemNumber={itemNumber} />
      ) : null}
      <div className={styles.question}>{copy.title}</div>
      {copy.detail ? <div className={styles.detail}>{copy.detail}</div> : null}
      <div className={styles.btnRow}>
        <button
          type="button"
          className={styles.cancelBtn}
          onClick={() => onRespond(false)}
          data-approval-id={approvalId}
        >
          {copy.cancel}
        </button>
        <button
          type="button"
          className={styles.confirmBtn}
          onClick={() => onRespond(true)}
          data-approval-id={approvalId}
        >
          {copy.confirm}
        </button>
      </div>
    </div>
  )
}
