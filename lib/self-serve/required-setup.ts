import {
  buildPublicSiteUrl,
  generatePublicSiteSlug,
  getPublicSiteSlugAlternatives,
  validatePublicSiteSlug,
} from '@/lib/public-site/show-link'
import { publishRequiredSetupCustomerSiteDraft } from './required-setup-site-draft'
import { reservedReviewerSetupSlug } from '@/lib/reviewer-smoke/identity'
import {
  REQUIRED_SETUP_STEPS,
  type RequiredSetupStepId,
  type RequiredSetupStatus,
  type RequiredSetupSessionRow,
  type RequiredSetupState,
  type SaveRequiredSetupAnswerOptions,
} from './required-setup-contract'
// Preserve existing server imports; browser consumers import the contract directly.
export { REQUIRED_SETUP_STEPS } from './required-setup-contract'
export type { RequiredSetupStepId, RequiredSetupStatus, RequiredSetupSessionRow, RequiredSetupState, SaveRequiredSetupAnswerOptions } from './required-setup-contract'

type JsonObject = Record<string, unknown>
type AdminClient = ReturnType<
  typeof import('@/lib/supabase/admin')['createAdminClient']
>

const REQUIRED_SETUP_STEP_IDS = REQUIRED_SETUP_STEPS.map((step) => step.id)
const REQUIRED_SETUP_STATUSES: RequiredSetupStatus[] = [
  'checkout_required',
  'payment_pending',
  'required_setup',
  'setup_blocked',
  'dashboard_unlocked',
]
const PAID_SETUP_SUBSCRIPTION_STATUSES = ['active', 'trialing'] as const

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeJsonObject(value: unknown): JsonObject {
  return isJsonObject(value) ? value : {}
}

function isUniqueViolationError(error: unknown) {
  return isJsonObject(error) && error.code === '23505'
}

function normalizeRequiredSetupStatus(value: string | null | undefined) {
  return REQUIRED_SETUP_STATUSES.includes(value as RequiredSetupStatus)
    ? (value as RequiredSetupStatus)
    : 'checkout_required'
}

function normalizeCompletedSteps(value: unknown): RequiredSetupStepId[] {
  if (!Array.isArray(value)) return []

  return value.filter(
    (step, index, steps): step is RequiredSetupStepId =>
      isRequiredSetupStepId(step) && steps.indexOf(step) === index,
  )
}

function assertRequiredSetupStepId(value: unknown): asserts value is RequiredSetupStepId {
  if (!isRequiredSetupStepId(value)) {
    throw new Error(`Unsupported required setup step: ${String(value)}`)
  }
}

function mergeStepPatch(
  collection: unknown,
  stepId: RequiredSetupStepId,
  patch: JsonObject,
): JsonObject {
  const normalizedCollection = normalizeJsonObject(collection)
  const currentStepValue = normalizedCollection[stepId]
  const currentStepObject = normalizeJsonObject(currentStepValue)

  return {
    ...normalizedCollection,
    [stepId]: {
      ...currentStepObject,
      ...patch,
    },
  }
}

async function loadRepByPublicSiteSlug(admin: AdminClient, slug: string) {
  const { data, error } = await admin
    .from('reps')
    .select('id, public_site_slug')
    .eq('public_site_slug', slug)
    .maybeSingle()

  if (error) throw error
  return data as { id: string; public_site_slug: string | null } | null
}

async function claimPublicSiteSlug(
  admin: AdminClient,
  repId: string,
  slug: string,
) {
  const { data, error } = await admin
    .from('reps')
    .update({ public_site_slug: slug })
    .eq('id', repId)
    .select('id, public_site_slug')
    .single()

  if (error) throw error
  return data as { id: string; public_site_slug: string }
}

async function buildAccountBasicsPublicSitePatch(
  admin: AdminClient,
  repId: string,
  answerPatch: JsonObject,
): Promise<JsonObject> {
  const hasExplicitSlug = typeof answerPatch.publicSiteSlug === 'string'
  const hasLiveShowName = typeof answerPatch.liveShowName === 'string'

  if (!hasExplicitSlug && !hasLiveShowName) {
    return answerPatch
  }

  const reservedSlug = await reservedReviewerSetupSlug(admin, repId)
  const generatedSlug = reservedSlug ?? (hasExplicitSlug
    ? generatePublicSiteSlug(answerPatch.publicSiteSlug as string)
    : generatePublicSiteSlug(answerPatch.liveShowName as string))

  const validation = validatePublicSiteSlug(generatedSlug)
  if (!validation.ok) {
    return buildPublicSiteSlugRedFlagPatch(
      answerPatch,
      generatedSlug,
      validation.reason,
    )
  }

  const existingOwner = await loadRepByPublicSiteSlug(admin, generatedSlug)
  if (existingOwner && existingOwner.id !== repId) {
    return buildPublicSiteSlugRedFlagPatch(answerPatch, generatedSlug, 'taken')
  }

  try {
    await claimPublicSiteSlug(admin, repId, generatedSlug)
  } catch (error) {
    if (isUniqueViolationError(error)) {
      return buildPublicSiteSlugRedFlagPatch(answerPatch, generatedSlug, 'taken')
    }

    throw error
  }

  return {
    ...answerPatch,
    publicSiteSlug: generatedSlug,
    publicSiteUrl: buildPublicSiteUrl(generatedSlug),
    publicSiteSlugStatus: 'accepted',
    publicSiteSlugRedFlag: null,
    publicSiteSlugAlternatives: [],
  }
}

function buildPublicSiteSlugRedFlagPatch(
  answerPatch: JsonObject,
  generatedSlug: string,
  redFlag: string,
): JsonObject {
  return {
    ...answerPatch,
    publicSiteSlug: null,
    publicSiteUrl: null,
    publicSiteSlugStatus: 'needs_review',
    publicSiteSlugRedFlag: redFlag,
    publicSiteSlugAlternatives: getPublicSiteSlugAlternatives(generatedSlug),
  }
}

export function isRequiredSetupStepId(
  value: unknown,
): value is RequiredSetupStepId {
  return REQUIRED_SETUP_STEP_IDS.includes(value as RequiredSetupStepId)
}

export function getNextRequiredSetupStep(
  completedSteps: readonly unknown[],
): RequiredSetupStepId | null {
  const completed = new Set(normalizeCompletedSteps([...completedSteps]))
  return REQUIRED_SETUP_STEP_IDS.find((step) => !completed.has(step)) ?? null
}

export function canUnlockRequiredSetup(completedSteps: readonly unknown[]) {
  return getNextRequiredSetupStep(completedSteps) === null
}

export function normalizeRequiredSetupSession(
  row: RequiredSetupSessionRow | null | undefined,
): RequiredSetupState {
  if (!row) {
    const completedSteps: RequiredSetupStepId[] = []
    return {
      id: null,
      repId: null,
      status: 'checkout_required',
      currentStep: 'account_basics',
      completedSteps,
      steps: REQUIRED_SETUP_STEPS,
      answers: {},
      generatedCopy: {},
      supportState: {},
      dashboardUnlockedAt: null,
      createdAt: null,
      updatedAt: null,
      nextStep: getNextRequiredSetupStep(completedSteps),
      canUnlockDashboard: canUnlockRequiredSetup(completedSteps),
    }
  }

  const completedSteps = normalizeCompletedSteps(row.completed_steps)
  const nextStep = getNextRequiredSetupStep(completedSteps)

  return {
    id: row.id,
    repId: row.rep_id,
    status: normalizeRequiredSetupStatus(row.status),
    currentStep: isRequiredSetupStepId(row.current_step)
      ? row.current_step
      : 'account_basics',
    completedSteps,
    steps: REQUIRED_SETUP_STEPS,
    answers: normalizeJsonObject(row.answers),
    generatedCopy: normalizeJsonObject(row.generated_copy),
    supportState: normalizeJsonObject(row.support_state),
    dashboardUnlockedAt: row.dashboard_unlocked_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    nextStep,
    canUnlockDashboard: nextStep === null,
  }
}

async function loadRequiredSetupSessionRow(
  admin: AdminClient,
  repId: string,
) {
  const { data, error } = await admin
    .from('self_serve_setup_sessions')
    .select('*')
    .eq('rep_id', repId)
    .maybeSingle()

  if (error) throw error
  return data as RequiredSetupSessionRow | null
}

async function hasPaidSetupSubscription(admin: AdminClient, repId: string) {
  const { data, error } = await admin
    .from('subscriptions')
    .select('id, status')
    .eq('rep_id', repId)
    .in('status', [...PAID_SETUP_SUBSCRIPTION_STATUSES])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return Boolean(data)
}

async function updateRequiredSetupSession(
  admin: AdminClient,
  repId: string,
  patch: Record<string, unknown>,
  expected?: RequiredSetupSessionRow,
) {
  let query = admin
    .from('self_serve_setup_sessions')
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq('rep_id', repId)
  if (expected) {
    // Never overwrite a concurrent completion/unlock or another setup answer.
    query = query.eq('status', expected.status)
    query = expected.updated_at === null
      ? query.is('updated_at', null)
      : query.eq('updated_at', expected.updated_at)
  }
  const { data, error } = await query.select('*').single()

  if (expected && error?.code === 'PGRST116') throw new Error('Required setup changed; refresh the setup state and check again.')
  if (error) throw error
  return normalizeRequiredSetupSession(data as RequiredSetupSessionRow)
}

async function createRequiredSetupSessionAfterPaidAccess(
  admin: AdminClient,
  repId: string,
) {
  const { data, error } = await admin
    .from('self_serve_setup_sessions')
    .upsert(
      {
        rep_id: repId,
        status: 'required_setup',
        current_step: 'account_basics',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'rep_id' },
    )
    .select('*')
    .single()

  if (error) throw error
  return normalizeRequiredSetupSession(data as RequiredSetupSessionRow)
}

async function reconcilePaidRequiredSetupState(
  admin: AdminClient,
  repId: string,
  row: RequiredSetupSessionRow | null,
) {
  const state = normalizeRequiredSetupSession(row)
  if (
    state.status !== 'checkout_required' &&
    state.status !== 'payment_pending'
  ) {
    return state
  }

  if (!(await hasPaidSetupSubscription(admin, repId))) return state
  if (!row) return createRequiredSetupSessionAfterPaidAccess(admin, repId)

  return updateRequiredSetupSession(admin, repId, {
    status: 'required_setup',
    current_step: state.currentStep,
  })
}

function requireExistingRequiredSetupSession(
  row: RequiredSetupSessionRow | null,
  repId: string,
) {
  if (!row) {
    throw new Error(`Required setup session not found for rep ${repId}.`)
  }
  if (row.rep_id !== repId) throw new Error('Required setup tenant mismatch.')

  return row
}

export async function getRequiredSetupState(repId: string) {
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()
  const row = await loadRequiredSetupSessionRow(admin, repId)
  return reconcilePaidRequiredSetupState(admin, repId, row)
}

export async function ensureRequiredSetupSession(
  repId: string,
  status: RequiredSetupStatus = 'checkout_required',
) {
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()
  const existingRow = await loadRequiredSetupSessionRow(admin, repId)

  if (existingRow) {
    return normalizeRequiredSetupSession(existingRow)
  }

  const { data, error } = await admin
    .from('self_serve_setup_sessions')
    .insert(
      {
        rep_id: repId,
        status,
        current_step: 'account_basics',
        updated_at: new Date().toISOString(),
      },
    )
    .select('*')
    .single()

  if (error) throw error
  return normalizeRequiredSetupSession(data as RequiredSetupSessionRow)
}

export async function saveRequiredSetupAnswer(
  repId: string,
  stepId: RequiredSetupStepId,
  answerPatch: JsonObject,
  options: SaveRequiredSetupAnswerOptions = {},
) {
  assertRequiredSetupStepId(stepId)

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()
  const row = requireExistingRequiredSetupSession(
    await loadRequiredSetupSessionRow(admin, repId),
    repId,
  )
  // Live Lineup evidence is server-owned. Never persist chat claims, keys,
  // generated text, or support patches as this step's connection receipt.
  if (stepId === 'live_queue_setup') return normalizeRequiredSetupSession(row)
  const normalizedAnswerPatch =
    stepId === 'account_basics'
      ? await buildAccountBasicsPublicSitePatch(admin, repId, answerPatch)
      : answerPatch
  const patch: Record<string, unknown> = {
    answers: mergeStepPatch(row.answers, stepId, normalizedAnswerPatch),
  }

  if (options.generatedCopyPatch) {
    patch.generated_copy = mergeStepPatch(
      row.generated_copy,
      stepId,
      options.generatedCopyPatch,
    )
  }

  if (options.supportStatePatch) {
    patch.support_state = mergeStepPatch(
      row.support_state,
      stepId,
      options.supportStatePatch,
    )
  }

  return updateRequiredSetupSession(admin, repId, patch)
}

export async function completeRequiredSetupStep(
  repId: string,
  stepId: RequiredSetupStepId,
  answerPatch?: JsonObject,
) {
  assertRequiredSetupStepId(stepId)

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()
  const row = requireExistingRequiredSetupSession(
    await loadRequiredSetupSessionRow(admin, repId),
    repId,
  )
  const completedSteps = normalizeCompletedSteps(row.completed_steps)
  if (stepId === 'live_queue_setup') {
    // A historical completion remains valid; source health is not an access lease.
    if (completedSteps.includes(stepId) || row.status === 'dashboard_unlocked') {
      return normalizeRequiredSetupSession(row)
    }
    if (row.status !== 'required_setup' && row.status !== 'setup_blocked') {
      throw new Error('Live Lineup setup requires an active required setup session.')
    }
    const { readLineupSetupReadiness } = await import('@/lib/live-lineup/setup-readiness')
    const readiness = await readLineupSetupReadiness(admin, repId)
    if (!readiness.ready) {
      throw new Error(`Live Lineup connection is not ready (${readiness.reason}). Use the setup connection panel, then check again.`)
    }
    // Replace (do not merge) arbitrary prior claims. No credentials/customer IDs.
    answerPatch = { serverReceipt: {
      protocol: readiness.protocol, ready: true, checkedAt: readiness.checkedAt,
      lastReadyAt: readiness.lastReadyAt, generation: readiness.generation, revision: readiness.revision,
    } }
  }
  const nextCompletedSteps = completedSteps.includes(stepId)
    ? completedSteps
    : [...completedSteps, stepId]
  const nextStep = getNextRequiredSetupStep(nextCompletedSteps)
  const patch: Record<string, unknown> = {
    status: 'required_setup',
    completed_steps: nextCompletedSteps,
    current_step: nextStep ?? stepId,
  }

  if (answerPatch) {
    patch.answers = stepId === 'live_queue_setup'
      ? { ...normalizeJsonObject(row.answers), [stepId]: answerPatch }
      : mergeStepPatch(row.answers, stepId, answerPatch)
  }

  return updateRequiredSetupSession(admin, repId, patch, stepId === 'live_queue_setup' ? row : undefined)
}

export async function unlockRequiredSetup(repId: string) {
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()
  const row = requireExistingRequiredSetupSession(
    await loadRequiredSetupSessionRow(admin, repId),
    repId,
  )
  const completedSteps = normalizeCompletedSteps(row.completed_steps)
  const state = normalizeRequiredSetupSession(row)

  if (!canUnlockRequiredSetup(completedSteps)) {
    throw new Error(
      'Required setup is incomplete; complete all required steps before unlocking dashboard.',
    )
  }

  if (state.status === 'dashboard_unlocked') {
    return state
  }

  if (state.status !== 'required_setup') {
    throw new Error(`Cannot unlock required setup from ${state.status}.`)
  }

  await publishRequiredSetupCustomerSiteDraft(admin, state)

  return updateRequiredSetupSession(admin, repId, {
    status: 'dashboard_unlocked',
    dashboard_unlocked_at: new Date().toISOString(),
  })
}
