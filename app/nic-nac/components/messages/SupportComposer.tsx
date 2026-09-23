'use client'

import { ArrowLeft, Bug, HelpCircle, ImagePlus, Lightbulb, Send, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { SupportDraft, SupportMessageType } from './types'
import styles from './MessageCenter.module.css'

const SUPPORT_TYPES: Array<{
  type: SupportMessageType
  label: string
  description: string
  icon: typeof HelpCircle
}> = [
  {
    type: 'question',
    label: 'Ask for help',
    description: 'Get help understanding or completing something.',
    icon: HelpCircle,
  },
  {
    type: 'bug',
    label: 'Report a problem',
    description: 'Tell us about something broken or not working as expected.',
    icon: Bug,
  },
  {
    type: 'idea',
    label: 'Share an idea',
    description: 'Suggest a change that could make Sparkle Suite better.',
    icon: Lightbulb,
  },
]

const EMPTY_DRAFT: SupportDraft = {
  type: null,
  summary: '',
  details: '',
  expectedResult: '',
  actualResult: '',
  urgency: 'normal',
  screenshots: [],
  source: null,
}

export function SupportComposer({
  source,
  initialType = null,
  navigationRevision = 0,
  headingRef,
  onCancel,
  onSubmit,
}: {
  source?: string | null
  initialType?: SupportMessageType | null
  navigationRevision?: number
  headingRef: React.RefObject<HTMLHeadingElement | null>
  onCancel: () => void
  onSubmit: (draft: SupportDraft) => Promise<void>
}) {
  const [draft, setDraft] = useState<SupportDraft>(() => ({
    ...EMPTY_DRAFT,
    type: initialType,
    source: source ?? null,
  }))
  useEffect(() => {
    if (!initialType && !source) return
    setDraft((current) => ({
      ...current,
      type: initialType ?? current.type,
      source: source ?? current.source,
    }))
  }, [initialType, navigationRevision, source])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [headingRef])

  function update<Field extends keyof SupportDraft>(
    field: Field,
    value: SupportDraft[Field],
  ) {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  function addScreenshots(files: FileList | null) {
    if (!files) return
    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
    const next = Array.from(files)
    if (draft.screenshots.length + next.length > 3) {
      setError('Choose no more than three screenshots.')
      return
    }
    const invalid = next.find(
      (file) => !allowedTypes.has(file.type) || file.size > 8 * 1024 * 1024,
    )
    if (invalid) {
      setError('Screenshots must be JPEG, PNG, or WebP and no larger than 8 MB each.')
      return
    }
    setError(null)
    update('screenshots', [...draft.screenshots, ...next])
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft.type || !draft.summary.trim() || !draft.details.trim()) return
    setPending(true)
    setError(null)
    setStatus('Sending your message to Sparkle Suite Support…')
    try {
      await onSubmit({
        ...draft,
        summary: draft.summary.trim(),
        details: draft.details.trim(),
        expectedResult: draft.expectedResult.trim(),
        actualResult: draft.actualResult.trim(),
      })
      setStatus('Received by Sparkle Suite Support.')
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'Your support message could not be sent. Your draft is still here.',
      )
      setStatus('')
    } finally {
      setPending(false)
    }
  }

  return (
    <section className={styles.supportComposer} aria-labelledby="support-composer-title">
      <button type="button" className={styles.backButton} onClick={onCancel}>
        <ArrowLeft aria-hidden="true" /> Back to Messages
      </button>
      <header>
        <h2 id="support-composer-title" ref={headingRef} tabIndex={-1}>
          Contact Sparkle Suite Support
        </h2>
        <p>
          Choose what you need, then share just enough detail for Support to
          understand the next step.
        </p>
      </header>

      <form onSubmit={submit}>
        <fieldset className={styles.supportTypeFieldset}>
          <legend>How can we help?</legend>
          <div className={styles.supportTypeGrid}>
            {SUPPORT_TYPES.map((option) => {
              const Icon = option.icon
              return (
                <label
                  key={option.type}
                  className={
                    draft.type === option.type
                      ? styles.supportTypeSelected
                      : styles.supportType
                  }
                >
                  <input
                    type="radio"
                    name="support-type"
                    value={option.type}
                    checked={draft.type === option.type}
                    onChange={() => update('type', option.type)}
                  />
                  <Icon aria-hidden="true" />
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>

        {draft.type ? (
          <div className={styles.supportFields}>
            <label>
              <span>Short summary</span>
              <input
                className="ph-no-capture"
                value={draft.summary}
                required
                minLength={3}
                maxLength={160}
                placeholder={
                  draft.type === 'idea'
                    ? 'Example: Saved show checklists'
                    : 'A few words about what you need'
                }
                onChange={(event) => update('summary', event.target.value)}
              />
            </label>
            <label>
              <span>Details</span>
              <textarea
                className="ph-no-capture"
                value={draft.details}
                required
                minLength={10}
                maxLength={4000}
                rows={5}
                placeholder="What happened, what is confusing, or what would you like to see?"
                onChange={(event) => update('details', event.target.value)}
              />
            </label>

            {draft.type === 'bug' ? (
              <div className={styles.optionalFields}>
                <label>
                  <span>What did you expect? <small>Optional</small></span>
                  <textarea
                    className="ph-no-capture"
                    value={draft.expectedResult}
                    rows={2}
                    maxLength={1000}
                    onChange={(event) =>
                      update('expectedResult', event.target.value)
                    }
                  />
                </label>
                <label>
                  <span>What happened instead? <small>Optional</small></span>
                  <textarea
                    className="ph-no-capture"
                    value={draft.actualResult}
                    rows={2}
                    maxLength={1000}
                    onChange={(event) => update('actualResult', event.target.value)}
                  />
                </label>
                <label>
                  <span>How urgent is this?</span>
                  <select
                    value={draft.urgency}
                    onChange={(event) =>
                      update(
                        'urgency',
                        event.target.value as SupportDraft['urgency'],
                      )
                    }
                  >
                    <option value="normal">Normal</option>
                    <option value="blocking">I cannot continue</option>
                    <option value="showtime_urgent">A live show is affected</option>
                  </select>
                </label>
              </div>
            ) : null}

            <div className={styles.screenshotField}>
              <div>
                <strong>Screenshots</strong>
                <span>Optional · up to 3 private images</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className={styles.visuallyHidden}
                onChange={(event) => addScreenshots(event.target.files)}
              />
              <button
                type="button"
                className={styles.secondaryButton}
                disabled={draft.screenshots.length >= 3}
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus aria-hidden="true" /> Add screenshots
              </button>
              {draft.screenshots.length ? (
                <ul className={styles.screenshotList}>
                  {draft.screenshots.map((file, index) => (
                    <li key={`${file.name}:${file.size}:${index}`}>
                      <span>{file.name}</span>
                      <button
                        type="button"
                        aria-label={`Remove ${file.name}`}
                        onClick={() =>
                          update(
                            'screenshots',
                            draft.screenshots.filter((_, itemIndex) => itemIndex !== index),
                          )
                        }
                      >
                        <X aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className={styles.destinationNotice}>
              <strong>Sending to Sparkle Suite Support</strong>
              <span>
                Your message will open a private Support conversation in Message
                Center. We will show “Received” after it is safely saved.
              </span>
            </div>
            <button
              type="submit"
              className={styles.primaryButton}
              disabled={
                pending ||
                !draft.summary.trim() ||
                draft.details.trim().length < 10
              }
            >
              <Send aria-hidden="true" />
              {pending ? 'Sending…' : 'Send to Support'}
            </button>
          </div>
        ) : null}
        {error ? (
          <div className={styles.errorMessage} role="alert">
            {error}
          </div>
        ) : null}
        <p className={styles.srStatus} role="status" aria-live="polite">
          {status}
        </p>
      </form>
    </section>
  )
}
