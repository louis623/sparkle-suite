'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import NicNacClient from '@/app/nic-nac/_client'
import type { OperatorSupportClientContext } from '@/lib/operator-support/client-runtime'
import { buildOperatorSupportGatewayUrl } from '@/lib/operator-support/client-runtime'

export function SupportWorkspaceClient({
  context,
  liveLineupReadOnly = false,
}: {
  context: OperatorSupportClientContext
  liveLineupReadOnly?: boolean
}) {
  const [ready, setReady] = useState(false)
  const [ending, setEnding] = useState(false)
  const [endError, setEndError] = useState<string | null>(null)
  const [endDialogOpen, setEndDialogOpen] = useState(false)
  const [changedAnything, setChangedAnything] = useState<boolean | null>(null)
  const [completionSummary, setCompletionSummary] = useState('')
  const originalFetchRef = useRef<typeof window.fetch | null>(null)
  const operatorSupportContext = useMemo(
    () => ({
      sessionId: context.sessionId,
      operatorDisplayName: context.operator.displayName,
      targetDisplayName: context.target.displayName,
    }),
    [
      context.operator.displayName,
      context.sessionId,
      context.target.displayName,
    ],
  )

  useEffect(() => {
    const originalFetch = window.fetch.bind(window)
    originalFetchRef.current = originalFetch

    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const rawUrl =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url
      const gatewayUrl = buildOperatorSupportGatewayUrl(
        rawUrl,
        context.sessionId,
        window.location.origin,
      )
      if (!gatewayUrl) return originalFetch(input, init)

      const sourceRequest = input instanceof Request ? input : null
      const headers = new Headers(sourceRequest?.headers ?? init?.headers)
      headers.set('x-sparkle-support-csrf', context.csrfToken)
      headers.set('x-sparkle-support-request-id', crypto.randomUUID())

      return originalFetch(gatewayUrl, {
        ...(sourceRequest
          ? {
              method: sourceRequest.method,
              body:
                sourceRequest.method === 'GET' || sourceRequest.method === 'HEAD'
                  ? undefined
                  : sourceRequest.body,
              credentials: sourceRequest.credentials,
              signal: sourceRequest.signal,
            }
          : init),
        headers,
        credentials: 'include',
      })
    }
    setReady(true)

    return () => {
      if (originalFetchRef.current) window.fetch = originalFetchRef.current
      originalFetchRef.current = null
    }
  }, [context.csrfToken, context.sessionId])

  if (!ready) {
    return <div className="p-6 text-sm text-slate-600">Securing support Workspace…</div>
  }

  async function endSupportAccess() {
    if (changedAnything === null) return
    setEnding(true)
    setEndError(null)
    try {
      const response = await originalFetchRef.current?.(
        `/api/control-center/support-sessions/${encodeURIComponent(context.sessionId)}/end`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'content-type': 'application/json',
            'x-sparkle-support-csrf': context.csrfToken,
          },
          body: JSON.stringify({
            changedAnything,
            completionSummary: completionSummary.trim() || undefined,
          }),
        },
      )
      const body = (await response?.json().catch(() => null)) as
        | { error?: string }
        | null
      if (!response?.ok) throw new Error(body?.error ?? 'Support access could not be ended.')
      window.location.assign('/control-center')
    } catch (error) {
      setEndError(error instanceof Error ? error.message : 'Support access could not be ended.')
      setEnding(false)
    }
  }

  return (
    <div>
      <aside className="sticky top-0 z-[100] flex flex-wrap items-center justify-between gap-3 border-b border-amber-300 bg-amber-100 px-4 py-3 text-amber-950 shadow-sm">
        <div>
          <strong>Support mode — acting for {context.target.displayName}</strong>
          <p className="text-sm">
            Signed in as {context.operator.displayName}. Every action is logged; billing,
            payments, account ownership, sign-in, and security changes are disabled.
          </p>
          <p className="text-sm font-semibold">
            Access stays open until you choose End support access.
          </p>
          {endError ? <p aria-live="assertive" className="text-sm font-semibold text-rose-700" role="alert">{endError}</p> : null}
        </div>
        <button
          className="min-h-11 rounded-lg bg-amber-950 px-4 text-sm font-semibold text-white disabled:opacity-50"
          disabled={ending}
          onClick={() => setEndDialogOpen(true)}
          type="button"
        >
          {ending ? 'Ending access…' : 'End support access'}
        </button>
      </aside>
      {endDialogOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/60 p-4"
          role="dialog"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
            <h2 className="text-xl font-semibold text-slate-950">End support access</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Confirm whether anything changed. The rep receives this completion status in Message Center.
            </p>
            <fieldset className="mt-4 grid gap-2">
              <legend className="text-sm font-semibold text-slate-900">Did you change account content or setup?</legend>
              <label className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-3">
                <input
                  checked={changedAnything === true}
                  name="support-changed"
                  onChange={() => setChangedAnything(true)}
                  type="radio"
                />
                Yes, I made a change
              </label>
              <label className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-3">
                <input
                  checked={changedAnything === false}
                  name="support-changed"
                  onChange={() => setChangedAnything(false)}
                  type="radio"
                />
                No account changes
              </label>
            </fieldset>
            <label className="mt-4 grid gap-1 text-sm font-semibold text-slate-900">
              Customer-safe completion note (optional)
              <textarea
                className="min-h-24 rounded-lg border border-slate-300 p-3 font-normal"
                maxLength={1000}
                onChange={(event) => setCompletionSummary(event.target.value)}
                placeholder="Example: Updated the homepage welcome copy and verified the customer site."
                value={completionSummary}
              />
            </label>
            {endError ? <p className="mt-3 text-sm font-semibold text-rose-700">{endError}</p> : null}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-800"
                disabled={ending}
                onClick={() => setEndDialogOpen(false)}
                type="button"
              >
                Keep working
              </button>
              <button
                className="min-h-11 rounded-lg bg-amber-950 px-4 text-sm font-semibold text-white disabled:opacity-50"
                disabled={
                  ending ||
                  changedAnything === null ||
                  (changedAnything && completionSummary.trim().length < 5)
                }
                onClick={() => void endSupportAccess()}
                type="button"
              >
                {ending ? 'Ending access…' : 'Confirm and end access'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <NicNacClient
        operatorSupport={operatorSupportContext}
        liveLineupReadOnly={liveLineupReadOnly}
      />
    </div>
  )
}
