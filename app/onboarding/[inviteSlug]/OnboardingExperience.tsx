'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  nicNacAnswers,
  nicNacQuickQuestions,
  nicNacSensitiveTerms,
  officialResources,
  onboardingSteps,
  realityTips,
  supplyGroups,
  supplyOptions,
} from '../onboarding-content'

type ProgressStatus = 'not_started' | 'done' | 'needs_help'

type OnboardingState = {
  participant: {
    displayName: string
    status: string
    createdAt?: string | null
    lastActivityAt?: string | null
  }
  team: {
    displayName: string
    businessName: string
    teamName: string
  }
  progress: Array<{
    stepId: string
    status: ProgressStatus
    completedAt?: string | null
    updatedAt?: string | null
  }>
  messages: Array<{
    senderType: 'participant' | 'team_lead'
    body: string
    readAt?: string | null
    createdAt?: string | null
  }>
}

type NicNacMessage = {
  id: string
  role: 'rep' | 'nic-nac'
  body: string
  guideAnchor?: string
  resourceLabel?: string
}

const sensitiveResponse =
  'Keep that information private. For passwords, verification codes, banking, tax, identity, or account-specific payout problems, use the official Bomb Party or provider support channel. Do not send those details here or to your team lead.'

function responseError(payload: unknown, fallback: string) {
  if (
    payload &&
    typeof payload === 'object' &&
    'error' in payload &&
    typeof payload.error === 'string'
  ) {
    return payload.error
  }
  return fallback
}

export function OnboardingExperience({ token }: { token: string | null }) {
  const [state, setState] = useState<OnboardingState | null>(null)
  const [loading, setLoading] = useState(Boolean(token))
  const [error, setError] = useState<string | null>(null)
  const [savingStep, setSavingStep] = useState<string | null>(null)
  const [question, setQuestion] = useState('')
  const [sending, setSending] = useState(false)
  const [nicNacOpen, setNicNacOpen] = useState(false)
  const [nicNacQuestion, setNicNacQuestion] = useState('')
  const [nicNacMessages, setNicNacMessages] = useState<NicNacMessage[]>([
    {
      id: 'nic-nac-welcome',
      role: 'nic-nac',
      body: 'Hi! I’m your first stop for Bomb Party onboarding. Ask me about Bomb Party University, first-live setup, supplies, shipping, returns, customer care, income claims, or the official resource you need. If a question truly needs your team lead, I’ll help you prepare it for them.',
    },
  ])

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(
          `/api/team-onboarding/access?invite=${encodeURIComponent(token)}`,
          { cache: 'no-store', signal: controller.signal },
        )
        const payload = (await response.json().catch(() => null)) as
          | OnboardingState
          | { error?: string }
          | null
        if (!response.ok) {
          throw new Error(responseError(payload, 'This link is unavailable.'))
        }
        setState(payload as OnboardingState)
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === 'AbortError') return
        setError(
          caught instanceof Error
            ? caught.message
            : 'This link is unavailable.',
        )
      } finally {
        setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [token])

  const leadName = state?.team.displayName || 'your team lead'
  const businessName =
    state?.team.businessName || state?.team.teamName || 'Your team'
  const hasLoadedState = state !== null

  useEffect(() => {
    if (!hasLoadedState) return
    document.title = `${businessName} | New Rep Onboarding`
  }, [businessName, hasLoadedState])

  const progressByStep = useMemo(
    () => new Map(state?.progress.map((item) => [item.stepId, item.status]) ?? []),
    [state],
  )
  const completedCount = onboardingSteps.filter(
    (step) => progressByStep.get(step.id) === 'done',
  ).length

  async function saveProgress(stepId: string, status: ProgressStatus) {
    if (!token || savingStep) return
    setSavingStep(stepId)
    setError(null)
    try {
      const response = await fetch(
        `/api/team-onboarding/access/progress?invite=${encodeURIComponent(token)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stepId, status }),
        },
      )
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(
          responseError(payload, 'Your progress could not sync right now.'),
        )
      }
      setState((current) =>
        current
          ? {
              ...current,
              progress: [
                ...current.progress.filter((item) => item.stepId !== stepId),
                {
                  stepId,
                  status,
                  completedAt:
                    status === 'done' ? new Date().toISOString() : null,
                  updatedAt: new Date().toISOString(),
                },
              ],
            }
          : current,
      )
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Your progress could not sync right now.',
      )
    } finally {
      setSavingStep(null)
    }
  }

  async function sendQuestion() {
    const body = question.trim()
    if (!token || body.length < 2 || sending) return
    setSending(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/team-onboarding/access/messages?invite=${encodeURIComponent(token)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            body,
            clientRequestId: crypto.randomUUID(),
          }),
        },
      )
      const payload = (await response.json().catch(() => null)) as
        | { message?: OnboardingState['messages'][number]; error?: string }
        | null
      if (!response.ok || !payload?.message) {
        throw new Error(
          responseError(payload, 'Your message could not send right now.'),
        )
      }
      setState((current) =>
        current
          ? { ...current, messages: [...current.messages, payload.message!] }
          : current,
      )
      setQuestion('')
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Your message could not send right now.',
      )
    } finally {
      setSending(false)
    }
  }

  function askNicNac(value: string) {
    const body = value.trim()
    if (!body) return
    const normalized = body.toLowerCase()
    const isSensitive = nicNacSensitiveTerms.some((term) =>
      normalized.includes(term),
    )
    const matchedAnswer = isSensitive
      ? undefined
      : nicNacAnswers.find((answer) =>
          answer.triggers.some((trigger) => normalized.includes(trigger)),
        )
    const answer =
      (isSensitive ? sensitiveResponse : matchedAnswer?.response) ??
      `I do not have a reliable answer for that yet. I added your question to the Ask ${leadName} box below so you can review it before anything is sent.`

    const timestamp = Date.now()
    setNicNacMessages((current) => [
      ...current,
      { id: `rep-${timestamp}`, role: 'rep', body },
      {
        id: `nic-nac-${timestamp}`,
        role: 'nic-nac',
        body: answer,
        guideAnchor: matchedAnswer?.guideAnchor,
        resourceLabel: matchedAnswer?.resourceLabel,
      },
    ])
    setNicNacQuestion('')
    if (!isSensitive && !matchedAnswer) setQuestion(body)
  }

  function openNicNac(prompt?: string) {
    setNicNacOpen(true)
    if (prompt) askNicNac(prompt)
  }

  if (loading) {
    return (
      <main className="sparkle-onboarding status-shell">
        <p className="eyebrow">Sparkle Suite</p>
        <h1>Opening your New Rep Onboarding guide…</h1>
      </main>
    )
  }

  if (!token) {
    return (
      <main className="sparkle-onboarding status-shell">
        <p className="eyebrow">Sparkle Suite</p>
        <h1>Your New Rep Onboarding link is missing.</h1>
        <p>Ask your team lead to send you a fresh private onboarding link.</p>
      </main>
    )
  }

  if (error && !state) {
    return (
      <main className="sparkle-onboarding status-shell">
        <p className="eyebrow">Sparkle Suite</p>
        <h1>This link is unavailable.</h1>
        <p>{error}</p>
      </main>
    )
  }

  if (!state) return null

  return (
    <main className="sparkle-onboarding">
      <section className="hero" id="top">
        <p className="eyebrow">{businessName} · private onboarding</p>
        <h1>Welcome, {state.participant.displayName}.</h1>
        <p className="lede">
          Here is a helpful place to get started, feel prepared, and build a
          strong foundation for your first live.
        </p>
        <div className="hero-note">
          <strong>{leadName} is your team lead.</strong> Keep this private link
          handy so your completed steps and questions stay connected to them.
        </div>
      </section>

      <nav className="guide-nav" aria-label="Onboarding guide sections">
        <a href="#path">Start here</a>
        <button type="button" onClick={() => openNicNac()}>
          Ask Nic-Nac
        </button>
        <a href="#supplies">Supplies</a>
        <a href="#resources">Helpful links</a>
        <a href="#ask">Ask {leadName}</a>
      </nav>

      <section
        className="progress-section"
        id="path"
        aria-labelledby="path-title"
      >
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Your first steps</p>
            <h2 id="path-title">Start here and work through each step.</h2>
          </div>
          <p className="progress-label">
            {completedCount} of {onboardingSteps.length} steps complete
          </p>
        </div>
        <div
          className="progress-track"
          aria-label={`${completedCount} of ${onboardingSteps.length} steps complete`}
        >
          <span
            style={{
              width: `${(completedCount / onboardingSteps.length) * 100}%`,
            }}
          />
        </div>
        <div className="journey-list">
          {onboardingSteps.map((step, index) => {
            const status = progressByStep.get(step.id) ?? 'not_started'
            const saving = savingStep === step.id
            return (
              <details
                className={`journey-step ${status === 'done' ? 'done' : ''}`}
                id={`guide-${index + 1}`}
                key={step.id}
              >
                <summary>
                  <span className="step-number">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <strong>{step.title}</strong>
                    <p>{step.summary}</p>
                  </div>
                  <small>{status === 'done' ? 'Complete' : 'Open step'}</small>
                </summary>
                <div className="journey-body">
                  <div>
                    <h3>Do this</h3>
                    <ol>
                      {step.whatToDo.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ol>
                  </div>
                  <div className="two-column-notes">
                    <article>
                      <h3>Why this helps</h3>
                      <p>{step.whyItMatters}</p>
                    </article>
                    <article>
                      <h3>Ask {leadName} if…</h3>
                      <p>{step.askLeadWhen}</p>
                    </article>
                  </div>
                  <div className="journey-actions">
                    <button
                      type="button"
                      onClick={() => void saveProgress(step.id, 'done')}
                      disabled={saving || status === 'done'}
                    >
                      {status === 'done'
                        ? 'Step complete'
                        : saving
                          ? 'Saving…'
                          : 'Mark step complete'}
                    </button>
                    <button
                      className="ask-nic-nac-inline"
                      type="button"
                      onClick={() => openNicNac(step.nicNacPrompt)}
                    >
                      Ask Nic-Nac about this step
                    </button>
                  </div>
                </div>
              </details>
            )
          })}
        </div>
        <div className="nic-nac-first">
          <div>
            <strong>Have a question?</strong>
            <p>
              Ask Nic-Nac first. He knows the onboarding guide and the official
              Bomb Party resources new reps use most.
            </p>
          </div>
          <button type="button" onClick={() => openNicNac()}>
            Ask Nic-Nac
          </button>
        </div>
      </section>

      <details className="reality-section">
        <summary>
          <div>
            <p className="eyebrow">Before your first live</p>
            <h2>A few things to remember</h2>
          </div>
          <span>Open tips</span>
        </summary>
        <div className="reality-grid">
          {realityTips.map(([title, description]) => (
            <article key={title}>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </details>

      <section
        className="supplies"
        id="supplies"
        aria-labelledby="supplies-title"
      >
        <p className="eyebrow">Supply list</p>
        <h2 id="supplies-title">What you may need for lives and shipping</h2>
        <p className="section-intro">
          This list covers common supplies for setting up a live, staying
          organized, and packing customer orders. Start with what you already
          have, compare the options, and check with Nic-Nac before spending
          money on anything you are unsure about.
        </p>
        <div className="supply-legend" aria-label="Supply timing guide">
          <span>
            <b>Compare for setup</b> · review while planning
          </span>
          <span>
            <b>Helpful later</b> · wait until the need is clear
          </span>
          <span>
            <b>Ask {leadName} first</b> · confirm before buying
          </span>
        </div>
        <div className="supply-groups">
          {supplyGroups.map((group) => {
            const groupOptions = supplyOptions.filter((option) =>
              group.categories.includes(option.category),
            )
            return (
              <details className="supply-group" key={group.title}>
                <summary>
                  <div>
                    <strong>{group.title}</strong>
                    <span>{group.description}</span>
                  </div>
                  <small>{groupOptions.length} items</small>
                </summary>
                <div className="supply-grid">
                  {groupOptions.map((option) => (
                    <article className="supply-card" key={option.href}>
                      <div className="supply-meta">
                        <span>{option.category}</span>
                        <small>
                          {option.timing.replace('your team lead', leadName)}
                        </small>
                      </div>
                      <h3>{option.title}</h3>
                      <p>{option.note}</p>
                      <a href={option.href} target="_blank" rel="noreferrer">
                        View Amazon option ↗
                      </a>
                    </article>
                  ))}
                </div>
              </details>
            )
          })}
        </div>
      </section>

      <section
        className="resources"
        id="resources"
        aria-labelledby="resources-title"
      >
        <p className="eyebrow">Helpful links</p>
        <h2 id="resources-title">Bomb Party resources to keep handy</h2>
        <p className="section-intro">
          Use these links when you need training, shipping, returns, replacement
          help, or income information. Nic-Nac can help you find the right one.
        </p>
        <div className="resource-links">
          {officialResources.map((resource) => (
            <a
              href={resource.href}
              target="_blank"
              rel="noreferrer"
              key={resource.href}
            >
              <small>{resource.category}</small>
              <strong>{resource.title}</strong>
              <p>{resource.description}</p>
              <span>Open resource ↗</span>
            </a>
          ))}
        </div>
      </section>

      <section className="ask" id="ask" aria-labelledby="ask-title">
        <p className="eyebrow">Still need help?</p>
        <h2 id="ask-title">Ask {leadName}</h2>
        <div className="ask-nic-nac-first">
          <div>
            <strong>Start with Nic-Nac.</strong>
            <p>
              He can answer most common onboarding questions and point you to
              the right step or official resource. If the question needs{' '}
              {leadName}, he will help you prepare it here.
            </p>
          </div>
          <button type="button" onClick={() => openNicNac()}>
            Ask Nic-Nac first
          </button>
        </div>
        <p>
          Questions you send here appear in {leadName}’s private Team
          Management workspace. Their replies stay with your onboarding thread.
        </p>
        {state.messages.length ? (
          <div className="thread" aria-label="Onboarding messages">
            {state.messages.map((message, index) => (
              <div
                className={`message ${message.senderType}`}
                key={`${message.createdAt ?? 'message'}-${index}`}
              >
                <strong>
                  {message.senderType === 'team_lead' ? leadName : 'You'}
                </strong>
                <p>{message.body}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="quiet">
            No questions yet. Ask when you need a real answer.
          </p>
        )}
        <label htmlFor="question">Your question</label>
        <textarea
          id="question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="What do you need help with?"
        />
        <button
          className="send-button"
          type="button"
          onClick={() => void sendQuestion()}
          disabled={sending || question.trim().length < 2}
        >
          {sending ? 'Sending…' : `Send to ${leadName}`}
        </button>
        <p className="privacy-note">
          Do not send passwords, verification codes, banking details,
          government IDs, or other sensitive account information here.
        </p>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      <aside
        className={`nic-nac ${nicNacOpen ? 'open' : ''}`}
        aria-label="Nic-Nac onboarding helper"
      >
        {nicNacOpen ? (
          <section className="nic-nac-panel">
            <header>
              <div>
                <strong>Ask Nic-Nac</strong>
                <span>Your Bomb Party onboarding helper</span>
              </div>
              <button
                type="button"
                onClick={() => setNicNacOpen(false)}
                aria-label="Close Nic-Nac onboarding helper"
              >
                Close
              </button>
            </header>
            <p className="nic-nac-limit">
              <strong>Ask me first:</strong> I can help with BPU, getting paid,
              first-live setup, supplies, shipping, returns, customer care,
              income claims, privacy, and finding the right official resource.
              I cannot see private accounts or handle passwords, banking, tax,
              or identity information.
            </p>
            <div
              className="nic-nac-quick"
              aria-label="Quick onboarding questions"
            >
              {nicNacQuickQuestions.map((quickQuestion) => (
                <button
                  type="button"
                  onClick={() => askNicNac(quickQuestion)}
                  key={quickQuestion}
                >
                  {quickQuestion}
                </button>
              ))}
            </div>
            <div className="nic-nac-thread" aria-live="polite">
              {nicNacMessages.map((message) => (
                <div
                  className={`nic-nac-message ${message.role}`}
                  key={message.id}
                >
                  <strong>{message.role === 'nic-nac' ? 'Nic-Nac' : 'You'}</strong>
                  <p>{message.body}</p>
                  {message.guideAnchor ? (
                    <a
                      href={message.guideAnchor}
                      onClick={() => setNicNacOpen(false)}
                    >
                      {message.resourceLabel ?? 'Open related guide'} ↓
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault()
                askNicNac(nicNacQuestion)
              }}
            >
              <label htmlFor="nic-nac-question">
                Ask your onboarding question
              </label>
              <div>
                <input
                  id="nic-nac-question"
                  value={nicNacQuestion}
                  onChange={(event) => setNicNacQuestion(event.target.value)}
                  placeholder="What do I need help with?"
                />
                <button type="submit" disabled={!nicNacQuestion.trim()}>
                  Ask
                </button>
              </div>
            </form>
            <a
              className="nic-nac-escalation"
              href="#ask"
              onClick={() => setNicNacOpen(false)}
            >
              Review or send a question to {leadName} ↓
            </a>
          </section>
        ) : null}
        <button
          className="nic-nac-button"
          type="button"
          onClick={() => setNicNacOpen((current) => !current)}
          aria-expanded={nicNacOpen}
        >
          {nicNacOpen ? 'Close Nic-Nac' : 'Ask Nic-Nac'}
        </button>
      </aside>

      <footer>
        <span>Built for {businessName}. You are not alone in this.</span>
        <a href="#top">Back to top ↑</a>
      </footer>
    </main>
  )
}
