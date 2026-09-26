'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  DefaultChatTransport,
  type UIMessage,
} from 'ai'
import { DashboardPlaceholder } from './components/DashboardPlaceholder'
import { NicNacChatBody } from './components/NicNacChatBody'
import { NicNacColumn } from './components/NicNacColumn'
import { NicNacGlyph } from './components/NicNacGlyph'
import { NicNacMobileShell } from './components/NicNacMobileShell'
import { RequiredSetupHome } from './components/RequiredSetupHome'
import { WorkspaceAccessPending } from './components/WorkspaceAccessPending'
import {
  buildConversationStateUrl,
  canUseUrlConversationId,
  getConversationIdFromSearch,
  putConversationIdInSearch,
  readJsonResponse,
} from '@/lib/nic-nac/client-conversation-routing'
import {
  shouldStartNicNacRollover,
  type NicNacConversationRunHealth,
} from '@/lib/nic-nac/rollover'
import {
  buildCustomerSparkleSiteHref,
} from '@/lib/nic-nac/rep-links'
import {
  getLaunchPromptForWorkspaceAction,
  type WorkspaceLaunchAction,
} from '@/lib/nic-nac/workspace-launch-actions'
import { resolveNicNacWorkspaceMode } from '@/lib/nic-nac/required-setup-client-mode'
import type { SiteSettingsDashboardResult } from '@/lib/services/types'
import {
  REQUIRED_SETUP_STEPS,
  type RequiredSetupState,
} from '@/lib/self-serve/required-setup-contract'
import { createClient } from '@/lib/supabase/client'
import shellStyles from './_shell.module.css'

const STORAGE_KEY = 'nic_nac_last_conversation'
const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)'
const SETUP_STATE_TIMEOUT_MS = 10_000
const CHECKOUT_SYNC_TIMEOUT_MS = 15_000

function newConversationId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function getInitialDesktopMatch() {
  return true
}

type ConversationHydrateResponse = {
  conversationId?: string
  messages?: UIMessage[]
  runHealth?: NicNacConversationRunHealth
}

type ConversationRolloverResponse = {
  conversationId?: string
  messages?: UIMessage[]
}

type SetupStateWithLiveQueue = RequiredSetupState & {
  liveQueueSyncCode?: string | null
}

function isReviewerSmokeSetupState(state: SetupStateWithLiveQueue | null) {
  const reviewerSmoke = state?.supportState?.reviewer_smoke
  return typeof reviewerSmoke === 'object' && reviewerSmoke !== null
}

function isWorkspaceReviewSetupState(state: SetupStateWithLiveQueue | null) {
  const reviewWorkspace = state?.supportState?.review_workspace
  return typeof reviewWorkspace === 'object' && reviewWorkspace !== null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getSetupAnswerRecord(
  state: SetupStateWithLiveQueue | null,
  stepId: string,
) {
  const answer = isRecord(state?.answers) ? state.answers[stepId] : null
  return isRecord(answer) ? answer : {}
}

function getStringAnswer(
  answers: Record<string, unknown>,
  key: string,
  fallback = '',
) {
  const value = answers[key]
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function getRequiredSetupPublicSiteSlug(state: SetupStateWithLiveQueue | null) {
  const accountBasics = getSetupAnswerRecord(state, 'account_basics')
  return getStringAnswer(accountBasics, 'publicSiteSlug') || null
}

function buildReviewSiteSettings(
  state: SetupStateWithLiveQueue | null,
): SiteSettingsDashboardResult | undefined {
  if (!isWorkspaceReviewSetupState(state)) return undefined

  const accountBasics = getSetupAnswerRecord(state, 'account_basics')
  const welcomeCopy = getSetupAnswerRecord(state, 'welcome_copy')

  return {
    displayName: getStringAnswer(accountBasics, 'repName', 'Review Rep'),
    businessName: getStringAnswer(accountBasics, 'businessName', 'Sparkle Suite Review Studio'),
    email: getStringAnswer(accountBasics, 'email'),
    phone: getStringAnswer(accountBasics, 'phone'),
    shopLink: getStringAnswer(accountBasics, 'bombPartyRepStoreLink'),
    bannerText: getStringAnswer(welcomeCopy, 'bannerText'),
    bannerVisible: Boolean(getStringAnswer(welcomeCopy, 'bannerText')),
    tickerText: getStringAnswer(welcomeCopy, 'tickerText'),
    tickerVisible: Boolean(getStringAnswer(welcomeCopy, 'tickerText')),
    tagline: getStringAnswer(welcomeCopy, 'tagline'),
    heroImageUrl: '',
    heroAnimationType: 'sparkle_rise',
    teamName: getStringAnswer(accountBasics, 'teamName'),
    memberTeamName: '',
    showJoinPage: true,
    customerSiteTemplate: 'amethyst',
    appearancePreset: 'sparkle_suite_morganite',
    socialHandles: {},
  }
}

function buildSetupStateUrl() {
  if (typeof window === 'undefined') return '/api/self-serve/setup-state'

  const conversationId = new URLSearchParams(window.location.search)
    .get('conversationId')
    ?.trim()
  if (!conversationId) return '/api/self-serve/setup-state'

  return `/api/self-serve/setup-state?conversationId=${encodeURIComponent(conversationId)}`
}

function buildLoginRedirectHref() {
  if (typeof window === 'undefined') return '/login?redirect=%2Fnic-nac'

  const returnPath = `${window.location.pathname}${window.location.search}${window.location.hash}`
  return `/login?redirect=${encodeURIComponent(returnPath)}`
}

function buildWorkspaceReviewFallbackState(): SetupStateWithLiveQueue | null {
  if (typeof window === 'undefined') return null

  const conversationId = getConversationIdFromSearch(window.location.search)
  if (!conversationId) return null

  return {
    id: null,
    repId: 'rep-gracie-smoke-review',
    status: 'dashboard_unlocked',
    currentStep: 'final_preview_approval',
    completedSteps: REQUIRED_SETUP_STEPS.map((step) => step.id),
    steps: REQUIRED_SETUP_STEPS,
    answers: {
      account_basics: {
        repName: 'Gracie Smoke',
        businessName: 'Gracie Test Studio 20260605001558',
        email: 'gracie.smoke@example.test',
      },
      site_skin: {
        preset: 'sparkle_suite_morganite',
      },
      welcome_copy: {},
    },
    generatedCopy: {},
    supportState: {
      review_workspace: {
        enabled: true,
        source: 'client_fallback',
        conversationId,
      },
    },
    dashboardUnlockedAt: null,
    createdAt: null,
    updatedAt: null,
    nextStep: null,
    canUnlockDashboard: true,
    liveQueueSyncCode: 'GS2-2335',
  }
}

function shouldUseLocalWorkspaceReviewFallback() {
  if (typeof window === 'undefined') return false

  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1'
}

type SetupStateResponse = {
  state?: SetupStateWithLiveQueue
  error?: string
}

type StripeSyncResponse = {
  synced?: boolean
  error?: string
}

type ReviewerSmokeResponse =
  | {
      ok: true
      email: string
      password: string
      next: string
    }
  | {
      ok?: false
      error?: string
    }

export default function NicNacClient({
  reviewerSmokeVisible = false,
  liveLineupReadOnly = false,
  operatorSupport,
}: {
  reviewerSmokeVisible?: boolean
  liveLineupReadOnly?: boolean
  operatorSupport?: {
    sessionId: string
    operatorDisplayName: string
    targetDisplayName: string
  }
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const wantsCheckout = searchParams.get('onboarding') === 'checkout-required'
  const wantsRequiredSetup = searchParams.get('onboarding') === 'required-setup'
  const billingState = searchParams.get('billing')
  const reviewerSmokeToken = searchParams.get('review')?.trim() ?? ''
  const checkoutSessionId = searchParams.get('session_id')?.trim() ?? ''
  const activeWorkspaceSection = searchParams.get('section')?.trim() ?? ''
  const operatorSupportSessionId = operatorSupport?.sessionId ?? null
  const isOperatorSupport = operatorSupportSessionId !== null
  const workspaceRoutePath = isOperatorSupport
    ? `/control-center/support/${encodeURIComponent(operatorSupportSessionId)}`
    : '/nic-nac'
  const shouldKeepDesktopNicNacOpen = activeWorkspaceSection === 'help-resources'
  const isCheckoutSuccessReturn =
    wantsRequiredSetup &&
    billingState === 'subscription-success' &&
    checkoutSessionId.length > 0
  const [checkoutSyncedSessionId, setCheckoutSyncedSessionId] = useState<string | null>(null)
  const checkoutSyncComplete =
    isCheckoutSuccessReturn && checkoutSyncedSessionId === checkoutSessionId
  const isFinalizingCheckout = isCheckoutSuccessReturn && !checkoutSyncComplete

  const [setupState, setSetupState] = useState<SetupStateWithLiveQueue | null>(null)
  const [setupStateStatus, setSetupStateStatus] = useState<
    'loading' | 'ready' | 'error'
  >('loading')
  const [setupStateError, setSetupStateError] = useState<string | null>(null)
  const [reviewerResetBusy, setReviewerResetBusy] = useState(false)
  const [reviewerResetError, setReviewerResetError] = useState<string | null>(null)

  const [conversationId, setConversationId] = useState<string | null>(null)
  const [historyState, setHistoryState] = useState<{
    conversationId: string | null
    messages: UIMessage[] | null
    error: string | null
  }>({
    conversationId: null,
    messages: null,
    error: null,
  })
  // Distinct from initLoadError: this fires when /latest itself fails (5xx /
  // network). We deliberately do NOT fall through to a fresh UUID here —
  // that would silently fork the rep onto a new conversation and re-create
  // the cross-device drift bug this whole change is fixing.
  const [initResolveError, setInitResolveError] = useState<string | null>(null)
  const [resolveAttempt, setResolveAttempt] = useState(0)
  const [isDesktop, setIsDesktop] = useState(getInitialDesktopMatch)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileTradeAlertTarget, setMobileTradeAlertTarget] = useState<HTMLElement | null>(null)
  const [desktopOpen, setDesktopOpen] = useState(true)
  const [pendingLaunchPrompt, setPendingLaunchPrompt] = useState<string | null>(null)
  // Lifted from the chat body so "New conversation" can disable correctly
  // without a context dance. The chat body pushes streaming/HITL state up.
  const [chatState, setChatState] = useState<{
    isStreaming: boolean
    hasPendingApproval: boolean
  }>({ isStreaming: false, hasPendingApproval: false })
  const chatStateRef = useRef(chatState)
  const [rolloverInFlight, setRolloverInFlight] = useState(false)
  const rolloverInFlightRef = useRef(false)
  const [clearInFlight, setClearInFlight] = useState(false)
  const wasStreamingRef = useRef(false)

  useEffect(() => {
    if (!isDesktop || !shouldKeepDesktopNicNacOpen) return
    setDesktopOpen(true)
  }, [isDesktop, shouldKeepDesktopNicNacOpen])

  const loadSetupState = useCallback(
    async (options: { signal?: AbortSignal; showLoading?: boolean } = {}) => {
      if (options.showLoading) setSetupStateStatus('loading')
      setSetupStateError(null)

      const localReviewFallbackState =
        reviewerSmokeVisible && shouldUseLocalWorkspaceReviewFallback()
          ? buildWorkspaceReviewFallbackState()
          : null
      if (localReviewFallbackState) {
        setSetupState(localReviewFallbackState)
        setSetupStateStatus('ready')
        return
      }

      const controller = new AbortController()
      const abortFromCaller = () => controller.abort('caller')
      if (options.signal?.aborted) controller.abort('caller')
      options.signal?.addEventListener('abort', abortFromCaller, { once: true })
      const timeoutId = window.setTimeout(() => {
        controller.abort('timeout')
      }, SETUP_STATE_TIMEOUT_MS)

      try {
        const res = await fetch(buildSetupStateUrl(), {
          credentials: 'include',
          signal: controller.signal,
        })
        if (!res.ok) {
          const fallbackState = reviewerSmokeVisible
            ? buildWorkspaceReviewFallbackState()
            : null
          if (fallbackState) {
            setSetupState(fallbackState)
            setSetupStateStatus('ready')
            return
          }

          if (res.status === 401) {
            router.replace(buildLoginRedirectHref())
            return
          }

          const body = (await res.json().catch(() => null)) as
            | SetupStateResponse
            | null
          setSetupState(null)
          setSetupStateError(body?.error ?? `Couldn't load setup state (${res.status}).`)
          setSetupStateStatus('error')
          return
        }
        const body = await readJsonResponse<SetupStateResponse>(
          res,
          'required setup state',
        )
        setSetupState(body.state ?? null)
        setSetupStateStatus('ready')
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') {
          if (controller.signal.reason === 'timeout') {
            const fallbackState = reviewerSmokeVisible
              ? buildWorkspaceReviewFallbackState()
              : null
            if (fallbackState) {
              setSetupState(fallbackState)
              setSetupStateStatus('ready')
              return
            }

            setSetupState(null)
            setSetupStateError(
              'Setup state did not load. Check local auth and environment configuration, then refresh.',
            )
            setSetupStateStatus('error')
          }
          return
        }
        const fallbackState = reviewerSmokeVisible
          ? buildWorkspaceReviewFallbackState()
          : null
        if (fallbackState) {
          setSetupState(fallbackState)
          setSetupStateStatus('ready')
          return
        }

        setSetupState(null)
        setSetupStateError(`Failed to load setup state: ${(err as Error).message}`)
        setSetupStateStatus('error')
      } finally {
        window.clearTimeout(timeoutId)
        options.signal?.removeEventListener('abort', abortFromCaller)
      }
    },
    [reviewerSmokeVisible, router],
  )

  const syncReturnedCheckoutSession = useCallback(
    async (sessionId: string, signal?: AbortSignal) => {
      const controller = new AbortController()
      const abortFromCaller = () => controller.abort('caller')
      if (signal?.aborted) controller.abort('caller')
      signal?.addEventListener('abort', abortFromCaller, { once: true })
      const timeoutId = window.setTimeout(() => {
        controller.abort('timeout')
      }, CHECKOUT_SYNC_TIMEOUT_MS)

      try {
        const res = await fetch('/api/stripe/sync', {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ sessionId }),
          signal: controller.signal,
        })
        if (res.ok) return

        const body = (await res.json().catch(() => null)) as
          | StripeSyncResponse
          | null
        throw new Error(body?.error ?? `Stripe checkout sync failed (${res.status}).`)
      } catch (err) {
        if (controller.signal.reason === 'timeout') {
          throw new Error(
            'Stripe checkout sync did not finish. Check Stripe and Supabase configuration, then refresh.',
          )
        }
        throw err
      } finally {
        window.clearTimeout(timeoutId)
        signal?.removeEventListener('abort', abortFromCaller)
      }
    },
    [],
  )

  useEffect(() => {
    const controller = new AbortController()
    ;(async () => {
      if (isFinalizingCheckout) {
        setSetupStateStatus('loading')
        setSetupStateError(null)
        try {
          await syncReturnedCheckoutSession(checkoutSessionId, controller.signal)
        } catch (err) {
          if ((err as { name?: string })?.name === 'AbortError') return
          setSetupState(null)
          setSetupStateError(
            err instanceof Error
              ? err.message
              : 'Stripe checkout sync failed.',
          )
          setSetupStateStatus('error')
          return
        }
        if (controller.signal.aborted) return
        setCheckoutSyncedSessionId(checkoutSessionId)
      }
      await loadSetupState({ signal: controller.signal, showLoading: true })
    })()
    return () => {
      controller.abort()
    }
  }, [
    billingState,
    checkoutSessionId,
    checkoutSyncComplete,
    isFinalizingCheckout,
    loadSetupState,
    syncReturnedCheckoutSession,
    wantsRequiredSetup,
  ])

  const setupStatus = setupState?.status
  const resolvedWorkspaceMode = resolveNicNacWorkspaceMode({
    setupStatus,
    isCheckoutSuccessReturn,
    wantsCheckout,
    wantsRequiredSetup,
  })
  const workspaceMode = isOperatorSupport ? 'dashboard_unlocked' : resolvedWorkspaceMode
  const isDashboardUnlocked = workspaceMode === 'dashboard_unlocked'
  const isRequiredSetupMode = workspaceMode === 'required_setup'
  const isCheckoutRequiredMode = workspaceMode === 'checkout_required'
  const shouldUseConversation =
    setupStateStatus === 'ready' &&
    !isCheckoutRequiredMode &&
    (isRequiredSetupMode || isDashboardUnlocked)
  const requiredSetupSyncCode = setupState?.liveQueueSyncCode ?? null
  const requiredSetupPublicSiteSlug = getRequiredSetupPublicSiteSlug(setupState)
  const requiredSetupPreviewHref = buildCustomerSparkleSiteHref({
    repId: setupState?.repId,
    publicSiteSlug: requiredSetupPublicSiteSlug,
  })
  const showWorkspaceReviewState =
    reviewerSmokeVisible && isWorkspaceReviewSetupState(setupState)

  useEffect(() => {
    const wasStreaming = wasStreamingRef.current
    wasStreamingRef.current = chatState.isStreaming
    if (!wasStreaming || chatState.isStreaming || !isRequiredSetupMode) return
    void loadSetupState()
  }, [chatState.isStreaming, isRequiredSetupMode, loadSetupState])

  useEffect(() => {
    chatStateRef.current = chatState
  }, [chatState])

  const activateConversation = useCallback(
    (next: string, messages?: UIMessage[]) => {
      setConversationId(next)
      if (messages) {
        setHistoryState({
          conversationId: next,
          messages,
          error: null,
        })
      }
      if (!isOperatorSupport && typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, next)
      }
      if (isOperatorSupport) return
      const nextSearch = putConversationIdInSearch(window.location.search, next)
      router.replace(nextSearch ? `${workspaceRoutePath}?${nextSearch}` : workspaceRoutePath)
    },
    [isOperatorSupport, router, workspaceRoutePath],
  )

  const rolloverConversation = useCallback(
    async (sourceConversationId: string) => {
      if (isOperatorSupport) return false
      const currentChatState = chatStateRef.current
      if (
        rolloverInFlightRef.current ||
        currentChatState.isStreaming ||
        currentChatState.hasPendingApproval
      ) {
        return false
      }
      rolloverInFlightRef.current = true
      setRolloverInFlight(true)
      try {
        const res = await fetch('/api/nic-nac/conversation-rollover', {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ conversationId: sourceConversationId }),
        })
        if (!res.ok) return false
        const body = (await readJsonResponse(
          res,
          'conversation rollover',
        ).catch(() => null)) as
          | ConversationRolloverResponse
          | null
        if (!body?.conversationId || !body.messages) return false
        activateConversation(body.conversationId, body.messages)
        return true
      } finally {
        rolloverInFlightRef.current = false
        setRolloverInFlight(false)
      }
    },
    [activateConversation, isOperatorSupport],
  )

  // Resolve conversationId via URL → /latest → fresh UUID. localStorage is
  // written for cache consistency but no longer read during init — DB is the
  // source of truth so cross-device sessions land on the same conversation.
  useEffect(() => {
    if (!shouldUseConversation) return
    const controller = new AbortController()
    let cancelled = false
    ;(async () => {
      setInitResolveError(null)
      const urlId = getConversationIdFromSearch(
        new URLSearchParams(Array.from(searchParams.entries())).toString(),
      )
      if (operatorSupportSessionId) {
        setConversationId(operatorSupportSessionId)
        setHistoryState({
          conversationId: operatorSupportSessionId,
          messages: null,
          error: null,
        })
        return
      }
      if (showWorkspaceReviewState) {
        // Workspace review mode starts fresh so Nic-Nac is visible without
        // requiring persisted conversation history or a signed-in browser.
        const id = urlId || newConversationId()
        if (cancelled) return
        setConversationId(id)
        setHistoryState({
          conversationId: id,
          messages: [],
          error: null,
        })
        if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, id)
        return
      }
      if (
        urlId &&
        canUseUrlConversationId({
          urlId,
          isCheckoutSuccessReturn,
          checkoutSyncComplete,
        })
      ) {
        if (cancelled) return
        setConversationId(urlId)
        if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, urlId)
        return
      }
      try {
        const res = await fetch(buildConversationStateUrl(), {
          credentials: 'include',
          signal: controller.signal,
        })
        if (cancelled) return
        if (res.status === 401) {
          // Let the history-load effect surface the auth error against
          // /conversation/[id]; it already renders "Not signed in — visit
          // /login and come back." Generate a placeholder id to advance.
          const id = newConversationId()
          setConversationId(id)
          if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, id)
          return
        }
        if (!res.ok) {
          // 5xx — DO NOT fabricate a UUID. Hold the loading region with a
          // retry affordance so transient DB failures don't fork the rep.
          setInitResolveError("Couldn't load your conversation.")
          return
        }
        const body = await readJsonResponse<{ conversationId: string | null }>(
          res,
          'latest conversation',
        )
        const resolved = body?.conversationId ?? null
        const id = resolved ?? newConversationId()
        setConversationId(id)
        if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, id)
        const nextSearch = putConversationIdInSearch(window.location.search, id)
        router.replace(nextSearch ? `${workspaceRoutePath}?${nextSearch}` : workspaceRoutePath)
      } catch (err) {
        if (cancelled) return
        if ((err as { name?: string })?.name === 'AbortError') return
        setInitResolveError("Couldn't load your conversation.")
      }
    })()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [
    checkoutSyncComplete,
    isCheckoutSuccessReturn,
    shouldUseConversation,
    showWorkspaceReviewState,
    router,
    searchParams,
    resolveAttempt,
    workspaceRoutePath,
    operatorSupportSessionId,
  ])

  useEffect(() => {
    if (!shouldUseConversation) return
    const mq = window.matchMedia(DESKTOP_MEDIA_QUERY)
    setIsDesktop(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [shouldUseConversation])

  // Load persisted history once conversationId is known.
  useEffect(() => {
    if (!shouldUseConversation) return
    if (!conversationId) return
    if (showWorkspaceReviewState) {
      setHistoryState({
        conversationId,
        messages: [],
        error: null,
      })
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(buildConversationStateUrl(conversationId), {
          credentials: 'include',
        })
        if (cancelled) return
        if (res.status === 401) {
          setHistoryState({
            conversationId,
            messages: null,
            error: 'Not signed in - visit /login and come back.',
          })
          return
        }
        if (res.status === 403) {
          setHistoryState({
            conversationId,
            messages: null,
            error: 'This conversation belongs to another rep.',
          })
          return
        }
        if (!res.ok) {
          setHistoryState({
            conversationId,
            messages: null,
            error: `Couldn't load conversation history (${res.status}).`,
          })
          return
        }
        const body = await readJsonResponse<ConversationHydrateResponse>(
          res,
          'conversation history',
        )
        if (cancelled) return
        if (
          !isOperatorSupport &&
          shouldStartNicNacRollover(body.runHealth) &&
          (await rolloverConversation(conversationId))
        ) {
          return
        }
        setHistoryState({
          conversationId,
          messages: (body.messages ?? []) as UIMessage[],
          error: null,
        })
      } catch (err) {
        if (cancelled) return
        setHistoryState({
          conversationId,
          messages: null,
          error: `Failed to load conversation: ${(err as Error).message}`,
        })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [
    conversationId,
    shouldUseConversation,
    showWorkspaceReviewState,
    rolloverConversation,
    isOperatorSupport,
  ])

  // Desktop Escape minimizes (only if no HITL pending).
  useEffect(() => {
    if (!isDesktop || !desktopOpen) return
    if (shouldKeepDesktopNicNacOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (chatState.hasPendingApproval) return
      // If user is typing in a textarea/input, let Escape blur instead of closing.
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) return
      e.preventDefault()
      setDesktopOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isDesktop, desktopOpen, chatState.hasPendingApproval, shouldKeepDesktopNicNacOpen])

  const transport = useMemo(() => {
    if (!conversationId) return null
    return new DefaultChatTransport({
      api: '/api/nic-nac',
      prepareSendMessagesRequest: ({ messages }) => ({
        body: {
          conversationId,
          messages,
          mode: isRequiredSetupMode ? 'required_setup' : 'workspace',
        },
      }),
    })
  }, [conversationId, isRequiredSetupMode])

  const initialMessages =
    conversationId && historyState.conversationId === conversationId
      ? historyState.messages
      : null
  const initLoadError =
    conversationId && historyState.conversationId === conversationId
      ? historyState.error
      : null
  const isReady = conversationId && transport && initialMessages !== null

  // Clear the persisted thread before rotating the id. Otherwise the latest
  // conversation lookup can resurrect its prior messages after a new visit.
  const handleNewConversation = useCallback(async () => {
    if (
      clearInFlight ||
      chatState.isStreaming ||
      chatState.hasPendingApproval ||
      !conversationId
    ) {
      return
    }
    setClearInFlight(true)
    try {
      if (!showWorkspaceReviewState) {
        const res = await fetch('/api/nic-nac/conversation/clear', {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ conversationId }),
        })
        if (!res.ok) return
      }
      activateConversation(operatorSupportSessionId ?? newConversationId(), [])
    } finally {
      setClearInFlight(false)
    }
  }, [activateConversation, chatState, clearInFlight, conversationId, operatorSupportSessionId, showWorkspaceReviewState])

  const handleLaunchNicNacAction = useCallback(
    (action: WorkspaceLaunchAction) => {
      const prompt = getLaunchPromptForWorkspaceAction(action)
      if (!prompt) return
      setPendingLaunchPrompt(prompt)
      if (!isDesktop) {
        setMobileOpen(true)
      } else {
        setDesktopOpen(true)
      }
    },
    [isDesktop],
  )

  const handleOpenNicNac = useCallback(() => {
    if (!isDesktop) {
      setMobileOpen(true)
      return
    }
    setDesktopOpen(true)
  }, [isDesktop])

  const handleSendNicNacPrompt = useCallback(
    (prompt: string) => {
      const trimmed = prompt.trim()
      if (!trimmed) {
        handleOpenNicNac()
        return
      }
      setPendingLaunchPrompt(trimmed)
      handleOpenNicNac()
    },
    [handleOpenNicNac],
  )

  const newDisabled =
    chatState.isStreaming || chatState.hasPendingApproval || rolloverInFlight || clearInFlight
  const showReviewerSetupActions =
    reviewerSmokeVisible && isReviewerSmokeSetupState(setupState)

  const handleReviewerSetupReset = useCallback(async () => {
    setReviewerResetBusy(true)
    setReviewerResetError(null)
    try {
      const res = await fetch('/api/reviewer-smoke/session', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          token: reviewerSmokeToken,
          state: 'required_setup',
        }),
      })
      const body = (await res.json().catch(() => null)) as
        | ReviewerSmokeResponse
        | null
      if (!res.ok || body?.ok !== true) {
        const message = body && 'error' in body ? body.error : undefined
        throw new Error(message ?? 'Unable to reset setup preview.')
      }

      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email: body.email,
        password: body.password,
      })
      if (error) throw error

      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY)
        window.location.href = reviewerSmokeToken
          ? `${body.next}${body.next.includes('?') ? '&' : '?'}review=${encodeURIComponent(reviewerSmokeToken)}`
          : body.next
      }
    } catch (err) {
      setReviewerResetError(
        err instanceof Error ? err.message : 'Unable to reset setup preview.',
      )
      setReviewerResetBusy(false)
    }
  }, [reviewerSmokeToken])

  const chatContent = isReady ? (
    <NicNacChatBody
      key={conversationId}
      conversationId={conversationId!}
      chatMode={isRequiredSetupMode ? 'required_setup' : 'workspace'}
      requiredSetupStep={setupState?.currentStep ?? null}
      requiredSetupRepId={setupState?.repId ?? null}
      requiredSetupSyncCode={requiredSetupSyncCode}
      requiredSetupPreviewHref={requiredSetupPreviewHref}
      transport={transport!}
      initialMessages={initialMessages!}
      onChatStateChange={setChatState}
      onRolloverRecommended={rolloverConversation}
      resetSignal={conversationId!}
      launchPrompt={pendingLaunchPrompt}
      onLaunchPromptConsumed={() => setPendingLaunchPrompt(null)}
    />
  ) : initResolveError ? (
    <div className={shellStyles.loading}>
      {initResolveError}
      <button
        type="button"
        onClick={() => setResolveAttempt((n) => n + 1)}
        className={shellStyles.retryLink}
      >
        Tap to retry
      </button>
    </div>
  ) : (
    <div className={shellStyles.loading}>{initLoadError ?? 'Loading…'}</div>
  )

  if (isCheckoutRequiredMode) {
    return <WorkspaceAccessPending status={setupStatus} />
  }

  if (isRequiredSetupMode && setupState) {
    return (
      <div className={`${shellStyles.root} ${shellStyles.setupRoot}`}>
        <RequiredSetupHome
          state={setupState}
          chat={chatContent}
          reviewerActions={
            showReviewerSetupActions ? (
              <>
                <button
                  type="button"
                  onClick={() => void handleReviewerSetupReset()}
                  disabled={reviewerResetBusy}
                >
                  {reviewerResetBusy ? 'Resetting...' : 'Reset setup preview'}
                </button>
                {reviewerResetError ? <p>{reviewerResetError}</p> : null}
              </>
            ) : null
          }
        />
      </div>
    )
  }

  if (setupStateStatus === 'loading') {
    return (
      <div className={shellStyles.root}>
        <div className={shellStyles.loading}>
          {isFinalizingCheckout ? 'Finalizing Stripe checkout...' : 'Loading setup...'}
        </div>
      </div>
    )
  }

  if (setupStateStatus === 'error') {
    return (
      <div className={shellStyles.root}>
        <div className={shellStyles.loading}>{setupStateError}</div>
      </div>
    )
  }

  return (
    <div
      className={`${shellStyles.root} ${
        isDesktop && !desktopOpen && !shouldKeepDesktopNicNacOpen
          ? shellStyles.rootMinimized
          : ''
      }`}
    >
      <DashboardPlaceholder
        liveLineupReadOnly={liveLineupReadOnly}
        repIdOverride={setupState?.repId ?? undefined}
        publicSiteSlugOverride={requiredSetupPublicSiteSlug}
        liveQueueSyncCodeOverride={requiredSetupSyncCode}
        initialSiteSettings={buildReviewSiteSettings(setupState)}
        reviewWorkspaceMode={showWorkspaceReviewState}
        operatorSupportMode={isOperatorSupport}
        onLaunchNicNacAction={handleLaunchNicNacAction}
        onSendNicNacPrompt={handleSendNicNacPrompt}
        onNewConversation={handleNewConversation}
        conversationControlsDisabled={newDisabled}
        desktopChat={
          isDesktop && (desktopOpen || shouldKeepDesktopNicNacOpen)
            ? chatContent
            : null
        }
        mobileTradeAlertTarget={mobileTradeAlertTarget}
      />
      {isDesktop ? (
        desktopOpen || shouldKeepDesktopNicNacOpen ? null : (
          <button
            type="button"
            className={shellStyles.desktopReopen}
            onClick={() => setDesktopOpen(true)}
            aria-label="Open Nic-Nac"
          >
            <NicNacGlyph size={26} />
          </button>
        )
      ) : (
        <NicNacMobileShell
          open={mobileOpen}
          onOpen={() => setMobileOpen(true)}
          onClose={() => setMobileOpen(false)}
        >
          <NicNacColumn
            variant="mobile"
            onClose={() => setMobileOpen(false)}
            onNewConversation={handleNewConversation}
            newConversationDisabled={newDisabled}
          >
            {chatContent}
            <div ref={setMobileTradeAlertTarget} className={shellStyles.mobileTradeAlertSlot} />
          </NicNacColumn>
        </NicNacMobileShell>
      )}
    </div>
  )
}
