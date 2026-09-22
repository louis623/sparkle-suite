'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  Archive,
  ArrowLeft,
  BadgeCheck,
  BellOff,
  ExternalLink,
  Inbox,
} from 'lucide-react'
import type {
  WorkspaceConversationDetail,
  WorkspaceInboxItem,
  WorkspaceMessageBodyBlock,
  RepReportInput,
  WorkspaceConversationAttachment,
} from './types'
import { isConversationItem } from './types'
import { ConversationComposer } from './ConversationComposer'
import { formatMessageDate, getInboxItemPresentation } from './InboxItem'
import {
  RepConversationSafetyActions,
  RepMessageRequestCard,
} from './RepMessageRequestCard'
import styles from './MessageCenter.module.css'

const APPROVED_SPARKLE_HOSTS = new Set([
  'yoursparklesuite.com',
  'www.yoursparklesuite.com',
  'yoursparklefinder.com',
  'www.yoursparklefinder.com',
])

const APPROVED_YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
])

export function getSafeMessageActionUrl(value?: string | null) {
  const href = value?.trim()
  if (!href) return null
  if (
    (href === '/nic-nac' || href.startsWith('/nic-nac?')) &&
    !href.startsWith('//')
  ) {
    return href
  }
  try {
    const parsed = new URL(href)
    return parsed.protocol === 'https:' &&
      !parsed.username &&
      !parsed.password &&
      !parsed.port &&
      APPROVED_SPARKLE_HOSTS.has(parsed.hostname.toLowerCase())
      ? parsed.toString()
      : null
  } catch {
    return null
  }
}

export function getSafeYouTubeActionUrl(value?: string | null) {
  const href = value?.trim()
  if (!href) return null
  try {
    const parsed = new URL(href)
    return parsed.protocol === 'https:' &&
      !parsed.username &&
      !parsed.password &&
      !parsed.port &&
      APPROVED_YOUTUBE_HOSTS.has(parsed.hostname.toLowerCase())
      ? parsed.toString()
      : null
  } catch {
    return null
  }
}

function PrivateSupportScreenshot({
  attachment,
}: {
  attachment: WorkspaceConversationAttachment
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let active = true
    void fetch(attachment.signedReadHref, {
      credentials: 'include',
      cache: 'no-store',
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as {
          url?: unknown
        } | null
        if (!response.ok || typeof payload?.url !== 'string') {
          throw new Error('Screenshot could not load.')
        }
        const parsed = new URL(payload.url)
        if (parsed.protocol !== 'https:') {
          throw new Error('Screenshot URL was not secure.')
        }
        if (active) {
          setSignedUrl(parsed.toString())
          setStatus('ready')
        }
      })
      .catch(() => {
        if (active) setStatus('error')
      })
    return () => {
      active = false
    }
  }, [attachment.signedReadHref, retryKey])

  return (
    <figure className={styles.privateScreenshot}>
      {status === 'ready' && signedUrl ? (
        <>
          {/* Private, short-lived URL returned only after the membership check. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={signedUrl}
            alt={`Support screenshot ${attachment.slot}`}
            width={attachment.width || undefined}
            height={attachment.height || undefined}
          />
          <figcaption>
            <a href={signedUrl} target="_blank" rel="noopener noreferrer">
              Open screenshot full size <ExternalLink aria-hidden="true" />
            </a>
            <span>Private link expires after five minutes.</span>
          </figcaption>
        </>
      ) : status === 'error' ? (
        <figcaption>
          <span>Screenshot could not load.</span>
          <button
            type="button"
            onClick={() => {
              setStatus('loading')
              setSignedUrl(null)
              setRetryKey((value) => value + 1)
            }}
          >
            Try again
          </button>
        </figcaption>
      ) : (
        <figcaption aria-live="polite">Loading private screenshot…</figcaption>
      )}
    </figure>
  )
}

function PublicationBody({
  body,
}: {
  body: string | WorkspaceMessageBodyBlock[]
}) {
  if (typeof body === 'string') return <p>{body}</p>
  return (
    <div className={styles.structuredBody}>
      {body.map((block, index) => {
        const key = `${block.type}:${index}`
        if (block.type === 'heading') {
          return block.text ? <h3 key={key}>{block.text}</h3> : null
        }
        if (block.type === 'metric') {
          return (
            <div className={styles.metricRow} key={key}>
              <span>{block.label || 'Metric'}</span>
              <strong>{block.value ?? 'Not available'}</strong>
            </div>
          )
        }
        if (block.type === 'list') {
          return block.items?.length ? (
            <ul key={key}>
              {block.items.map((item) => (
                <li key={`${key}:${item}`}>{item}</li>
              ))}
            </ul>
          ) : null
        }
        if (block.type === 'link_list') {
          return block.links?.length ? (
            <ul key={key}>
              {block.links.map((entry) => {
                const href = getSafeMessageActionUrl(entry.href)
                return (
                  <li key={`${key}:${entry.label}:${entry.href}`}>
                    {href?.startsWith('/') ? (
                      <a href={href}>{entry.label}</a>
                    ) : (
                      entry.label
                    )}
                  </li>
                )
              })}
            </ul>
          ) : null
        }
        return block.text ? <p key={key}>{block.text}</p> : null
      })}
    </div>
  )
}

export function ConversationThread({
  item,
  detail,
  detailStatus,
  actionPending,
  actionError,
  draftScope,
  headingRef,
  onBack,
  onSendReply,
  onRequestDecision,
  onReport,
  onBlock,
  onArchive,
  onMute,
  onRetry,
}: {
  item: WorkspaceInboxItem
  detail: WorkspaceConversationDetail | null
  detailStatus: 'idle' | 'loading' | 'ready' | 'error'
  actionPending: boolean
  actionError: string | null
  draftScope?: string | null
  headingRef: React.RefObject<HTMLHeadingElement | null>
  onBack: () => void
  onSendReply: (body: string) => Promise<void>
  onRequestDecision: (
    decision: 'accept' | 'decline' | 'decline_and_block',
  ) => Promise<void>
  onReport: (input: RepReportInput) => Promise<void>
  onBlock: () => Promise<void>
  onArchive: () => Promise<void>
  onMute: () => Promise<void>
  onRetry: () => void
}) {
  const presentation = getInboxItemPresentation(item)
  const actionUrl = !isConversationItem(item)
    ? getSafeMessageActionUrl(item.actionUrl)
    : getSafeMessageActionUrl(item.context?.href)
  const secondaryActionUrl = !isConversationItem(item)
    ? getSafeYouTubeActionUrl(item.secondaryActionUrl)
    : null

  return (
    <section className={styles.thread} aria-labelledby="active-message-title">
      <div className={styles.threadToolbar}>
        <button type="button" className={styles.backButton} onClick={onBack}>
          <ArrowLeft aria-hidden="true" /> Back to Messages
        </button>
        <div className={styles.threadActions}>
          {isConversationItem(item) && detail?.canMute ? (
            <button
              type="button"
              className={styles.iconButton}
              disabled={actionPending}
              aria-label={item.mutedAt ? 'Unmute conversation' : 'Mute conversation'}
              onClick={() => void onMute()}
            >
              <BellOff aria-hidden="true" />
            </button>
          ) : null}
          <button
            type="button"
            className={styles.iconButton}
            disabled={actionPending}
            aria-label={item.archivedAt ? 'Return message to inbox' : 'Archive message'}
            onClick={() => void onArchive()}
          >
            {item.archivedAt ? <Inbox aria-hidden="true" /> : <Archive aria-hidden="true" />}
          </button>
        </div>
      </div>

      <header className={styles.threadHeader}>
        <div className={styles.threadIdentity}>
          <span className={styles.threadAvatar} aria-hidden="true">
            {presentation.identity.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <div className={styles.threadTypeLine}>
              <span className={styles.typeLabel}>{presentation.typeLabel}</span>
              {!isConversationItem(item) ? (
                <span className={styles.verifiedLabel}>
                  <BadgeCheck aria-hidden="true" /> Verified sender
                </span>
              ) : null}
            </div>
            <h2 id="active-message-title" ref={headingRef} tabIndex={-1}>
              {presentation.subject}
            </h2>
            <p>{presentation.identity}</p>
          </div>
        </div>
        {isConversationItem(item) && item.context?.label ? (
          <div className={styles.contextCard}>
            <span>{item.context.label}</span>
            {item.context.value ? <strong>{item.context.value}</strong> : null}
            {actionUrl ? (
              actionUrl.startsWith('/') ? (
                <Link href={actionUrl} className={styles.contextLink}>
                  Open related area <ExternalLink aria-hidden="true" />
                </Link>
              ) : (
                <a
                  href={actionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.contextLink}
                >
                  Open related area <ExternalLink aria-hidden="true" />
                </a>
              )
            ) : null}
          </div>
        ) : null}
      </header>

      {!isConversationItem(item) ? (
        <div className={styles.officialMessage}>
          {item.summary ? <p className={styles.messageLead}>{item.summary}</p> : null}
          <PublicationBody body={item.body} />
          {actionUrl || secondaryActionUrl ? (
            <div className={styles.officialMessageActions}>
              {actionUrl ? (
                actionUrl.startsWith('/') ? (
                  <Link href={actionUrl} className={styles.primaryLink}>
                    {item.actionLabel || 'Open update'}
                  </Link>
                ) : (
                  <a
                    href={actionUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.primaryLink}
                  >
                    {item.actionLabel || 'Open update'}
                  </a>
                )
              ) : null}
              {secondaryActionUrl ? (
                <a
                  href={secondaryActionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.secondaryLink}
                >
                  {item.secondaryActionLabel || 'Watch on YouTube'}
                  <ExternalLink aria-hidden="true" />
                </a>
              ) : null}
            </div>
          ) : null}
          <div className={styles.readOnlyNotice}>
            <BadgeCheck aria-hidden="true" />
            <span>This is an official Sparkle Suite update.</span>
          </div>
        </div>
      ) : detailStatus === 'loading' ? (
        <div className={styles.threadLoading} aria-label="Loading conversation">
          <span />
          <span />
          <span />
        </div>
      ) : detailStatus === 'error' ? (
        <div className={styles.emptyState} role="alert">
          <strong>Conversation could not load</strong>
          <span>Try again to reconnect to this conversation.</span>
          <button type="button" className={styles.primaryButton} onClick={onRetry}>
            Try again
          </button>
        </div>
      ) : detail ? (
        <>
          <div className={styles.messageHistory} aria-label="Conversation messages">
            {detail.messages.map((message) => (
              <article
                key={message.id}
                className={`${styles.messageBubble} ${
                  message.kind !== 'message'
                    ? styles.systemMessage
                    : message.isOwn
                      ? styles.ownMessage
                      : styles.otherMessage
                }`}
              >
                <div className={styles.messageAuthor}>
                  <strong>{message.senderDisplayName}</strong>
                  <time dateTime={message.createdAt}>
                    {formatMessageDate(message.createdAt)}
                  </time>
                </div>
                <p>{message.body}</p>
                {message.deliveryState === 'failed' ? (
                  <span className={styles.failedLabel}>Not sent</span>
                ) : null}
              </article>
            ))}
          </div>

          {item.conversationType === 'support' && detail.attachments.length > 0 ? (
            <section className={styles.privateScreenshotGallery} aria-label="Support screenshots">
              <div>
                <strong>Attached screenshots</strong>
                <span>Visible only to you and Sparkle Suite Support.</span>
              </div>
              <div className={styles.privateScreenshotGrid}>
                {detail.attachments.map((attachment) => (
                  <PrivateSupportScreenshot
                    key={attachment.id}
                    attachment={attachment}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {item.conversationType === 'rep_direct' &&
          item.requestState === 'pending' &&
          item.requestDirection === 'incoming' ? (
            <RepMessageRequestCard
              senderName={item.senderDisplayName}
              pending={actionPending}
              onDecision={onRequestDecision}
              onReport={onReport}
            />
          ) : detail.canReply ? (
            <>
              <ConversationComposer
                conversationId={item.id}
                recipientName={item.senderDisplayName}
                draftScope={draftScope}
                disabled={actionPending}
                error={actionError}
                onSend={onSendReply}
              />
              {item.conversationType === 'rep_direct' ? (
                <RepConversationSafetyActions
                  repName={item.senderDisplayName}
                  pending={actionPending}
                  onBlock={onBlock}
                  onReport={onReport}
                />
              ) : null}
            </>
          ) : (
            <div className={styles.readOnlyNotice}>
              <span>
                {item.state === 'closed'
                  ? 'This conversation is closed. Start a new support message if you still need help.'
                  : 'Replies are not available for this conversation.'}
              </span>
            </div>
          )}
        </>
      ) : null}
    </section>
  )
}
