'use client'

import { Headphones, Network, Send, Users, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { RepDirectoryOption, TeamOnboardingOption } from './types'
import styles from './MessageCenter.module.css'

type NewMessagePath = 'team' | 'rep' | 'support' | null

const PATHS: Array<{
  key: Exclude<NewMessagePath, null>
  label: string
  description: string
  icon: typeof Users
}> = [
  {
    key: 'team',
    label: 'Message my team',
    description: 'Reply to onboarding questions and team conversations.',
    icon: Users,
  },
  {
    key: 'rep',
    label: 'Message another rep',
    description: 'Send a request to an eligible Sparkle Suite rep.',
    icon: Network,
  },
  {
    key: 'support',
    label: 'Contact Sparkle Suite Support',
    description: 'Ask for help, report a problem, or share an idea.',
    icon: Headphones,
  },
]

export function NewMessageDialog({
  open,
  repDirectory,
  repDirectoryStatus,
  teamDirectory,
  teamDirectoryStatus,
  onClose,
  onOpenTeam,
  onOpenTeamConversation,
  onSendTeamFirstMessage,
  onOpenSupport,
  onSendRepRequest,
}: {
  open: boolean
  repDirectory: RepDirectoryOption[]
  repDirectoryStatus: 'idle' | 'loading' | 'ready' | 'error'
  teamDirectory: TeamOnboardingOption[]
  teamDirectoryStatus: 'idle' | 'loading' | 'ready' | 'error'
  onClose: () => void
  onOpenTeam: () => void
  onOpenTeamConversation: (option: TeamOnboardingOption) => void
  onSendTeamFirstMessage: (participantId: string, body: string) => Promise<void>
  onOpenSupport: () => void
  onSendRepRequest: (input: {
    recipientRepId: string
    subject: string
    body: string
  }) => Promise<void>
}) {
  const [path, setPath] = useState<NewMessagePath>(null)
  const [recipientRepId, setRecipientRepId] = useState('')
  const [teamParticipantId, setTeamParticipantId] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null
    closeButtonRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
        ),
      )
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocusedRef.current?.focus()
    }
  }, [onClose, open])

  useEffect(() => {
    if (open) return
    setPath(null)
    setRecipientRepId('')
    setTeamParticipantId('')
    setSubject('')
    setBody('')
    setError(null)
  }, [open])

  if (!open) return null

  async function sendRepRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!recipientRepId || !subject.trim() || !body.trim()) return
    setPending(true)
    setError(null)
    try {
      await onSendRepRequest({
        recipientRepId,
        subject: subject.trim(),
        body: body.trim(),
      })
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'The message request could not be sent. Try again.',
      )
    } finally {
      setPending(false)
    }
  }

  const recipient = repDirectory.find((rep) => rep.repId === recipientRepId)
  const teamRecipient = teamDirectory.find((person) => person.id === teamParticipantId)

  async function sendTeamMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!teamRecipient || teamRecipient.workspaceConversationId || !body.trim()) return
    setPending(true)
    setError(null)
    try {
      await onSendTeamFirstMessage(teamRecipient.id, body.trim())
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Team message could not be sent.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className={styles.dialogBackdrop} role="presentation" onMouseDown={onClose}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-message-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.dialogHeader}>
          <div>
            <h2 id="new-message-title">
              {path === 'rep' ? 'Message another rep' : path === 'team' ? 'Message my team' : 'New message'}
            </h2>
            <p>
              {path === 'team'
                ? 'Choose an active New Rep Onboarding participant. Existing conversations open directly.'
                : path === 'rep'
                ? 'Your first note is a message request. The rep chooses whether to accept.'
                : 'Who would you like to contact?'}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className={styles.iconButton}
            aria-label="Close new message"
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </button>
        </header>

        {path === null ? (
          <div className={styles.messagePathList}>
            {PATHS.map((option) => {
              const Icon = option.icon
              return (
                <button
                  key={option.key}
                  type="button"
                  className={styles.messagePath}
                  onClick={() => {
                    if (option.key === 'team') {
                      setPath('team')
                      onOpenTeam()
                    }
                    else if (option.key === 'support') onOpenSupport()
                    else setPath('rep')
                  }}
                >
                  <Icon aria-hidden="true" />
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </span>
                </button>
              )
            })}
          </div>
        ) : path === 'team' ? (
          <form className={styles.repRequestForm} onSubmit={sendTeamMessage}>
            {teamDirectoryStatus === 'loading' ? (
              <div className={styles.loadingInline}>Finding your onboarding participants…</div>
            ) : teamDirectoryStatus === 'error' ? (
              <div className={styles.errorMessage} role="alert">
                Team participants could not load. Close this window and try again.
              </div>
            ) : teamDirectory.length === 0 ? (
              <div className={styles.emptyState}>
                <strong>No active onboarding participants</strong>
                <span>Add an onboarding participant in Team Management to start a conversation.</span>
              </div>
            ) : (
              <>
                <label>
                  <span>Choose an onboarding participant</span>
                  <select value={teamParticipantId} required onChange={(event) => {
                    setTeamParticipantId(event.target.value)
                    setBody('')
                  }}>
                    <option value="">Select a person</option>
                    {teamDirectory.map((person) => (
                      <option key={person.id} value={person.id}>{person.displayName}</option>
                    ))}
                  </select>
                </label>
                {teamRecipient?.workspaceConversationId ? (
                  <div className={styles.destinationNotice}>
                    <strong>Continue with {teamRecipient.displayName}</strong>
                    <span>Your existing conversation and draft will open.</span>
                  </div>
                ) : teamRecipient ? (
                  <label>
                    <span>Your first message to {teamRecipient.displayName}</span>
                    <textarea className="ph-no-capture" value={body} required minLength={2}
                      maxLength={4000} rows={4} placeholder="Write a message"
                      onChange={(event) => setBody(event.target.value)} />
                  </label>
                ) : null}
                <div className={styles.dialogFooter}>
                  <button type="button" className={styles.secondaryButton} onClick={() => setPath(null)}>Back</button>
                  {teamRecipient?.workspaceConversationId ? (
                    <button type="button" className={styles.primaryButton}
                      onClick={() => onOpenTeamConversation(teamRecipient)}>Open conversation</button>
                  ) : (
                    <button type="submit" className={styles.primaryButton}
                      disabled={pending || !teamRecipient || body.trim().length < 2}>
                      <Send aria-hidden="true" /> {pending ? 'Sending…' : 'Send message'}
                    </button>
                  )}
                </div>
              </>
            )}
            {error ? <div className={styles.errorMessage} role="alert">{error}</div> : null}
          </form>
        ) : path === 'rep' ? (
          <form className={styles.repRequestForm} onSubmit={sendRepRequest}>
            {repDirectoryStatus === 'loading' ? (
              <div className={styles.loadingInline}>Finding eligible reps…</div>
            ) : repDirectoryStatus === 'error' ? (
              <div className={styles.errorMessage} role="alert">
                Eligible reps could not load. Close this window and try again.
              </div>
            ) : repDirectory.length === 0 ? (
              <div className={styles.emptyState}>
                <strong>No eligible reps are available right now</strong>
                <span>
                  Rep Network requests are limited to active subscribers and
                  approved business relationships.
                </span>
              </div>
            ) : (
              <>
                <label>
                  <span>Choose an eligible rep</span>
                  <select
                    value={recipientRepId}
                    required
                    onChange={(event) => setRecipientRepId(event.target.value)}
                  >
                    <option value="">Select a rep</option>
                    {repDirectory.map((rep) => (
                      <option key={rep.repId} value={rep.repId}>
                        {rep.businessName} · {rep.displayName}
                      </option>
                    ))}
                  </select>
                </label>
                {recipient ? (
                  <div className={styles.destinationNotice}>
                    <strong>Sending a request to {recipient.businessName}</strong>
                    <span>
                      {recipient.contextLabel ||
                        'Only the rep’s public business identity is shared.'}
                    </span>
                  </div>
                ) : null}
                <label>
                  <span>What is this about?</span>
                  <input
                    className="ph-no-capture"
                    value={subject}
                    required
                    minLength={3}
                    maxLength={160}
                    placeholder="Example: Question about dancer RG12345"
                    onChange={(event) => setSubject(event.target.value)}
                  />
                </label>
                <label>
                  <span>Your request message</span>
                  <textarea
                    className="ph-no-capture"
                    value={body}
                    required
                    minLength={3}
                    maxLength={1000}
                    rows={4}
                    placeholder="Introduce yourself and explain why you would like to connect."
                    onChange={(event) => setBody(event.target.value)}
                  />
                </label>
                <div className={styles.dialogFooter}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => setPath(null)}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className={styles.primaryButton}
                    disabled={
                      pending ||
                      !recipientRepId ||
                      !subject.trim() ||
                      !body.trim()
                    }
                  >
                    <Send aria-hidden="true" />
                    {pending ? 'Sending…' : 'Send request'}
                  </button>
                </div>
              </>
            )}
            {error ? (
              <div className={styles.errorMessage} role="alert">
                {error}
              </div>
            ) : null}
          </form>
        ) : null}
      </div>
    </div>
  )
}
