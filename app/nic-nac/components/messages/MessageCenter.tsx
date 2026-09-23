'use client'

import { Mail, PenLine, RefreshCw, Search } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { ConversationThread } from './ConversationThread'
import { InboxItem } from './InboxItem'
import { MessageCenterFilters } from './MessageCenterFilters'
import { NewMessageDialog } from './NewMessageDialog'
import { SupportComposer } from './SupportComposer'
import type {
  MessageCenterActionState,
  MessageCenterState,
  WorkspaceConversationSummary,
  WorkspaceInboxItem,
} from './types'
import { isConversationItem } from './types'
import { useMessageCenter } from './useMessageCenter'
import styles from './MessageCenter.module.css'

export function MessageCenter({
  state,
  actionState,
  reviewMode = false,
  supportOnly = false,
  draftScope,
  onUpdatePublication,
  onUpdateConversation,
  onRetry,
}: {
  state: MessageCenterState
  actionState: MessageCenterActionState
  reviewMode?: boolean
  supportOnly?: boolean
  draftScope?: string | null
  onUpdatePublication: (
    item: WorkspaceInboxItem,
    patch: { read?: boolean; archived?: boolean },
  ) => void
  onUpdateConversation?: (
    item: WorkspaceConversationSummary,
    patch: Pick<WorkspaceConversationSummary, 'unreadCount'> &
      Partial<Pick<WorkspaceConversationSummary, 'archivedAt' | 'mutedAt'>>,
  ) => void
  onRetry: () => void
}) {
  const controller = useMessageCenter({
    state,
    reviewMode,
    supportOnly,
    onRefresh: onRetry,
    onUpdatePublication,
    onUpdateConversation,
  })
  const threadHeadingRef = useRef<HTMLHeadingElement | null>(null)
  const supportHeadingRef = useRef<HTMLHeadingElement | null>(null)
  const inboxPaneRef = useRef<HTMLDivElement | null>(null)
  const lastOpenedIdRef = useRef<string | null>(null)

  function backToInbox() {
    controller.backToInbox()
    window.requestAnimationFrame(() => {
      const buttons = inboxPaneRef.current?.querySelectorAll<HTMLButtonElement>('button[data-message-id]')
      const target = Array.from(buttons ?? []).find((button) => button.dataset.messageId === lastOpenedIdRef.current)
      target?.focus()
    })
  }

  useEffect(() => {
    if (controller.mode === 'thread') threadHeadingRef.current?.focus()
    if (controller.mode === 'support') supportHeadingRef.current?.focus()
  }, [controller.mode, controller.selectedItem?.id])

  const unreadCount = useMemo(
    () => state.inbox?.unreadCount ?? controller.items.reduce((total, item) => {
        if (item.archivedAt) return total
        return (
          total +
          (isConversationItem(item) ? item.unreadCount : item.isRead ? 0 : 1)
        )
      }, 0),
    [controller.items, state.inbox?.unreadCount],
  )
  const visibleUnread = unreadCount > 99 ? '99+' : String(unreadCount)

  return (
    <section className={styles.messageCenter} aria-labelledby="message-center-title">
      <header className={styles.centerHeader}>
        <div>
          <h1 id="message-center-title">Message Center</h1>
          <p>
            {supportOnly
              ? 'Ask a question, report a problem, or share an idea with Sparkle Suite Support.'
              : 'Team conversations, rep connections, Support, and Sparkle Suite updates—all in one inbox.'}
          </p>
        </div>
        <div className={styles.headerActions}>
          <span
            className={styles.unreadSummary}
            aria-label={`${unreadCount} unread message${unreadCount === 1 ? '' : 's'}`}
          >
            {visibleUnread} unread
          </span>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={controller.openNewMessage}
          >
            <PenLine aria-hidden="true" /> {supportOnly ? 'Contact Support' : 'New message'}
          </button>
        </div>
      </header>

      <MessageCenterFilters
        view={controller.view}
        sparkleSuiteFilter={controller.sparkleSuiteFilter}
        counts={controller.counts}
        supportOnly={supportOnly}
        onViewChange={controller.setView}
        onSparkleSuiteFilterChange={controller.setSparkleSuiteFilter}
      />

      <label className={styles.inboxSearch}>
          <Search aria-hidden="true" />
          <span className={styles.visuallyHidden}>Search people or conversation subjects</span>
          <input className="ph-no-capture" type="search" value={controller.searchInput}
            maxLength={80} placeholder="Search people or conversations"
            onChange={(event) => controller.setSearchInput(event.target.value)} />
      </label>

      {actionState.error || controller.actionError ? (
        <div className={styles.errorMessage} role="alert">
          {controller.actionError || actionState.error}
        </div>
      ) : null}
      {actionState.helperMessage ? (
        <div className={styles.successMessage} role="status" aria-live="polite">
          {actionState.helperMessage}
        </div>
      ) : null}

      {state.status === 'error' ? (
        <div className={styles.emptyState} role="alert">
          <Mail aria-hidden="true" />
          <strong>Messages could not load</strong>
          <span>Try again to reconnect to your inbox.</span>
          <button type="button" className={styles.primaryButton} onClick={onRetry}>
            <RefreshCw aria-hidden="true" /> Try again
          </button>
        </div>
      ) : state.status === 'loading' ? (
        <div className={styles.centerLoading} aria-label="Loading Message Center">
          <span />
          <span />
          <span />
        </div>
      ) : (
        <div
          className={`${styles.centerLayout} ${
            controller.mode !== 'inbox' ? styles.centerLayoutDetail : ''
          }`}
        >
          <div className={styles.inboxPane} ref={inboxPaneRef} aria-label="Messages">
            {controller.visibleItems.length ? (
              <div className={styles.inboxList}>
                {controller.visibleItems.map((item) => (
                  <InboxItem
                    key={`${item.kind ?? 'publication'}:${item.id}`}
                    item={item}
                    selected={controller.selectedItem?.id === item.id}
                    onOpen={() => {
                      lastOpenedIdRef.current = item.id
                      controller.openItem(item)
                    }}
                    onReply={() => {
                      lastOpenedIdRef.current = item.id
                      controller.openItem(item, true)
                    }}
                  />
                ))}
              </div>
            ) : controller.loadingPage ? (
              <div className={styles.loadingInline} role="status">Loading messages…</div>
            ) : (
              <div className={styles.emptyState}>
                <Mail aria-hidden="true" />
                <strong>
                  {controller.view === 'archived'
                    ? 'Nothing is archived'
                    : 'No messages here yet'}
                </strong>
                <span>
                  {controller.view === 'team'
                    ? 'Team and New Rep Onboarding conversations will appear here.'
                    : controller.view === 'rep-network'
                      ? 'Rep conversations and message requests will appear here.'
                      : controller.view === 'support'
                        ? 'Questions, problems, and ideas sent to Support will appear here.'
                        : controller.view === 'archived'
                          ? 'Archived messages remain available and can return to your inbox.'
                          : 'New messages will appear here when they arrive.'}
                </span>
                {controller.view === 'support' ? (
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={() => controller.openSupportComposer('message_center')}
                  >
                    Contact Support
                  </button>
                ) : null}
              </div>
            )}
            {controller.listError ? (
              <div className={styles.errorMessage} role="alert">
                {controller.listError}
                <button type="button" className={styles.textButton} onClick={controller.retryList}>Try again</button>
              </div>
            ) : null}
            {controller.nextCursor ? (
              <div className={styles.loadMoreRow}>
                <button type="button" className={styles.secondaryButton}
                  disabled={controller.loadingPage} onClick={controller.loadMore}>
                  {controller.loadingPage ? 'Loading…' : 'Load older messages'}
                </button>
              </div>
            ) : null}
          </div>

          <div className={styles.detailPane}>
            {controller.mode === 'thread' && controller.selectedItem ? (
              <ConversationThread
                item={controller.selectedItem}
                detail={controller.detail}
                detailStatus={controller.detailStatus}
                actionPending={controller.pendingKey !== null}
                actionError={controller.actionError}
                draftScope={draftScope}
                replyFocusToken={controller.replyFocusToken}
                headingRef={threadHeadingRef}
                onBack={backToInbox}
                onSendReply={controller.sendReply}
                onRequestDecision={controller.requestDecision}
                onReport={controller.reportConversation}
                onBlock={controller.blockConversation}
                onArchive={controller.archiveSelected}
                onMute={controller.muteSelected}
                onRetry={controller.retryDetail}
              />
            ) : controller.mode === 'support' ? (
              <SupportComposer
                source={controller.initialSupportSource}
                initialType={controller.initialSupportType}
                navigationRevision={controller.supportNavigationRevision}
                headingRef={supportHeadingRef}
                onCancel={backToInbox}
                onSubmit={controller.submitSupport}
              />
            ) : (
              <div className={styles.welcomePane}>
                <Mail aria-hidden="true" />
                <h2>Select a message</h2>
                <p>
                  Open any message to read it. Reply controls appear only when
                  that conversation allows a reply.
                </p>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={controller.openNewMessage}
                >
                  {supportOnly ? 'Contact Support' : 'Start a new message'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {!supportOnly ? (
        <NewMessageDialog
          open={controller.newMessageOpen}
          repDirectory={controller.repDirectory}
          repDirectoryStatus={controller.repDirectoryStatus}
          teamDirectory={controller.teamDirectory}
          teamDirectoryStatus={controller.teamDirectoryStatus}
          onClose={controller.closeNewMessage}
          onOpenTeam={controller.openTeam}
          onOpenTeamConversation={controller.openTeamConversation}
          onSendTeamFirstMessage={controller.sendTeamFirstMessage}
          onOpenSupport={() => controller.openSupportComposer('message_center')}
          onSendRepRequest={controller.sendRepRequest}
        />
      ) : null}
    </section>
  )
}
