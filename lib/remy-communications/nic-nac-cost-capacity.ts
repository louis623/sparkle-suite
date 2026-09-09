import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { getNicNacModelPolicy } from '@/lib/nic-nac/core/model-policy'
import finderReportingPolicy from '@/config/nic-nac-finder-reporting-policy.json'

const MAX_MONTHLY_ROWS = 10_000
const FINDER_USAGE_PATH = '/api/internal/finder/control-center-nic-nac-usage'

export type ProductClass = 'suite' | 'finder'
export type CostClass = 'customer_facing' | 'internal'
export type RunPurpose = 'default' | 'escalated' | 'utility' | 'lab'
export type ModelFit = 'expected' | 'drift' | 'static' | 'unknown'

export type CostCapacityRun = {
  productClass: ProductClass
  costClass: CostClass
  surface: string
  provider: string
  model: string
  purpose: RunPurpose
  policyKey: string | null
  workload: string
  reasoningLevel: string | null
  expectedModel: string | null
  expectedReasoning: string | null
  modelFit: ModelFit
  runId: string
  inputTokens: number | null
  outputTokens: number | null
  cachedTokens: number | null
  estimatedCents: number | null
  actualCents: number | null
  successful: boolean
  hardFail: boolean
  startedAt: string
}

type SuiteRunRow = {
  run_id: string
  product: string | null
  surface: string | null
  model: string
  model_provider: string | null
  model_policy: string | null
  reasoning_level?: string | null
  routed_intents?: string[] | null
  workflow_type?: string | null
  status: string
  input_tokens: number | null
  output_tokens: number | null
  cache_read_tokens: number | null
  estimated_cost_cents: number | null
  hard_fail_phrase_count: number | null
  created_at: string
}

type FinderRunRow = {
  id: string
  status: string
  model_provider: string | null
  model_name: string | null
  model_policy_key: string | null
  reasoning_effort?: string | null
  requested_intents?: string[] | null
  prompt_tokens: number | null
  completion_tokens: number | null
  estimated_cost_usd: number | string | null
  error_code: string | null
  started_at: string
}

type ProviderProductCost = {
  actualCents: number | null
  issue: string | null
  projectIdsConfigured: number
}

export type CostCapacitySnapshot = {
  month: string
  monthLabel: string
  generatedAt: string
  telemetryAt: string | null
  providerCostsAt: string | null
  rowsTruncated: boolean
  telemetryAvailable: boolean
  providerBalance: {
    cents: null
    basis: 'unavailable'
    billingUrl: string
    note: string
  }
  totals: ReturnType<typeof aggregateRuns> & {
    actualCents: number | null
    estimatedCents: number
  }
  products: Array<{
    productClass: ProductClass
    runs: number
    successfulWorkflows: number
    hardFails: number
    inputTokens: number
    outputTokens: number
    cachedTokens: number
    unknownCachedTokenRuns: number
    customerFacingEstimatedCents: number
    internalEstimatedCents: number
    estimatedCents: number
    actualCents: number | null
    costPerSuccessfulWorkflowCents: number | null
  }>
  rates: {
    elapsedDays: number
    runsPerDay: number
    tokensPerDay: number
    estimatedCentsPerDay: number
    actualCentsPerDay: number | null
  }
  byModel: Array<{
    productClass: ProductClass
    model: string
    purpose: RunPurpose
    workload: string
    expectedModel: string | null
    reasoningLevel: string | null
    expectedReasoning: string | null
    modelFit: ModelFit
    runs: number
    successfulWorkflows: number
    inputTokens: number
    outputTokens: number
    cachedTokens: number
    unknownCachedTokenRuns: number
    estimatedCents: number
    costPerSuccessfulWorkflowCents: number | null
    policyDrift: boolean
    unknownPrice: boolean
  }>
  modelPolicies: Array<{
    productClass: ProductClass
    purpose: RunPurpose
    policyKey: string
    model: string
    reasoning: string
    job: string
  }>
  recentRuns: CostCapacityRun[]
  coverageHoles: string[]
  alerts: string[]
  provider: Record<ProductClass, ProviderProductCost>
}

function asCount(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.round(value)
    : null
}

function policyPurpose(policy: string | null): RunPurpose {
  if (policy === 'human_escalated') return 'escalated'
  if (policy === 'utility_fast') return 'utility'
  if (policy === 'lab_synthesis') return 'lab'
  return 'default'
}

function classifyCost(purpose: RunPurpose, surface: string): CostClass {
  return purpose === 'utility' || purpose === 'lab' || surface.includes('lab')
    ? 'internal'
    : 'customer_facing'
}

const WORKFLOW_LABELS: Record<string, string> = {
  calendar_event_work: 'Calendar event work',
  trade_board_add_listing: 'Trade Board · add listing',
  trade_board_remove_listing: 'Trade Board · remove listing',
  trade_board_trade_request: 'Trade Board · trade request',
}

const INTENT_LABELS: Record<string, string> = {
  calendar: 'Calendar',
  catalog: 'Jewelry catalog',
  memory: 'Conversation & memory',
  notification: 'Notifications',
  required_setup: 'Workspace setup',
  resources: 'Help & resources',
  show_memory: 'Live show assistance',
  site: 'Customer site',
  trade_board: 'Trade Board',
}

function readableKey(value: string) {
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function describeWorkload(
  workflowType: string | null | undefined,
  intents: string[] | null | undefined,
  surface: string,
) {
  if (workflowType) return WORKFLOW_LABELS[workflowType] ?? readableKey(workflowType)
  const labels = [...new Set((intents ?? []).map((intent) => INTENT_LABELS[intent] ?? readableKey(intent)))]
  if (labels.length) return labels.slice(0, 3).join(' + ')
  if (surface.includes('lab')) return 'Sparkle Lab synthesis'
  if (surface === 'sparkle_finder') return 'Finder conversation'
  return 'General Nic-Nac conversation'
}

function policyForPurpose(purpose: RunPurpose, productClass: ProductClass = 'suite') {
  const key =
    purpose === 'escalated'
      ? 'human_escalated'
      : purpose === 'utility'
        ? 'utility_fast'
        : purpose === 'lab'
          ? 'lab_synthesis'
          : 'human_default'
  const suite = getNicNacModelPolicy(key)
  // Reporting baseline only: Finder is deployed independently. Never apply
  // Suite's environment overrides to Finder or change its runtime from here.
  return productClass === 'finder'
    ? { ...suite, ...finderReportingPolicy[key] }
    : suite
}

function modelFit(model: string, expectedModel: string | null): ModelFit {
  if (model === 'No model (static)') return 'static'
  if (model === 'Unknown (not recorded)' || !expectedModel) return 'unknown'
  return model === expectedModel ? 'expected' : 'drift'
}

export function dollarsToIntegerCents(value: number | string | null) {
  if (value === null || value === '') return null
  const dollars = Number(value)
  return Number.isFinite(dollars) && dollars >= 0
    ? Math.round((dollars + Number.EPSILON) * 100)
    : null
}

export function normalizeSuiteRun(row: SuiteRunRow): CostCapacityRun {
  const purpose = policyPurpose(row.model_policy)
  const policy = policyForPurpose(purpose)
  const surface = row.surface ?? 'unknown'
  const isStaticApplicationRun =
    !row.model_provider &&
    !row.model_policy &&
    (row.input_tokens ?? 0) === 0 &&
    (row.output_tokens ?? 0) === 0 &&
    row.estimated_cost_cents === 0
  const model = isStaticApplicationRun ? 'No model (static)' : row.model
  const expectedModel = isStaticApplicationRun ? null : policy.modelId
  return {
    productClass: 'suite',
    costClass: classifyCost(purpose, surface),
    surface,
    provider: isStaticApplicationRun ? 'application' : row.model_provider ?? 'unknown',
    model,
    purpose,
    policyKey: isStaticApplicationRun ? null : row.model_policy ?? policy.key,
    workload: describeWorkload(row.workflow_type, row.routed_intents, surface),
    reasoningLevel: isStaticApplicationRun ? null : row.reasoning_level ?? null,
    expectedModel,
    expectedReasoning: isStaticApplicationRun ? null : policy.reasoning,
    modelFit: modelFit(model, expectedModel),
    runId: row.run_id,
    inputTokens: asCount(row.input_tokens),
    outputTokens: asCount(row.output_tokens),
    cachedTokens: asCount(row.cache_read_tokens),
    estimatedCents: asCount(row.estimated_cost_cents),
    actualCents: null,
    successful: row.status === 'complete',
    hardFail:
      row.status === 'error' ||
      row.status === 'aborted' ||
      (row.hard_fail_phrase_count ?? 0) > 0,
    startedAt: row.created_at,
  }
}

export function normalizeFinderRun(row: FinderRunRow): CostCapacityRun {
  const purpose = policyPurpose(row.model_policy_key)
  const policy = policyForPurpose(purpose, 'finder')
  const surface = 'sparkle_finder'
  const isStaticApplicationRun = row.status === 'redirected'
  const model = isStaticApplicationRun
    ? 'No model (static)'
    : row.model_name ?? 'Unknown (not recorded)'
  const expectedModel = isStaticApplicationRun ? null : policy.modelId
  return {
    productClass: 'finder',
    costClass: classifyCost(purpose, surface),
    surface,
    provider: isStaticApplicationRun ? 'application' : row.model_provider ?? 'unknown',
    model,
    purpose,
    policyKey: isStaticApplicationRun ? null : row.model_policy_key ?? policy.key,
    workload: describeWorkload(null, row.requested_intents, surface),
    reasoningLevel: isStaticApplicationRun ? null : row.reasoning_effort ?? null,
    expectedModel,
    expectedReasoning: isStaticApplicationRun ? null : policy.reasoning,
    modelFit: modelFit(model, expectedModel),
    runId: row.id,
    inputTokens: asCount(row.prompt_tokens),
    outputTokens: asCount(row.completion_tokens),
    // Finder does not yet persist cached-input tokens. Null is intentional.
    cachedTokens: null,
    estimatedCents: dollarsToIntegerCents(row.estimated_cost_usd),
    actualCents: null,
    successful: row.status === 'completed' || row.status === 'redirected',
    hardFail: row.status === 'failed' || Boolean(row.error_code),
    startedAt: row.started_at,
  }
}

function aggregateRuns(rows: CostCapacityRun[]) {
  return {
    runs: rows.length,
    successfulWorkflows: rows.filter((row) => row.successful).length,
    hardFails: rows.filter((row) => row.hardFail).length,
    inputTokens: rows.reduce((sum, row) => sum + (row.inputTokens ?? 0), 0),
    outputTokens: rows.reduce((sum, row) => sum + (row.outputTokens ?? 0), 0),
    cachedTokens: rows.reduce((sum, row) => sum + (row.cachedTokens ?? 0), 0),
    unknownCachedTokenRuns: rows.filter((row) => row.cachedTokens === null).length,
    unknownEstimatedCostRuns: rows.filter((row) => row.estimatedCents === null).length,
  }
}

function knownPriceModel(model: string) {
  return ['gpt-5.6-terra', 'gpt-5.4', 'gpt-5.4-mini', 'gpt-5.5'].some(
    (prefix) => model === prefix || model.startsWith(`${prefix}-20`),
  )
}

function groupByModel(rows: CostCapacityRun[]) {
  const groups = new Map<string, CostCapacityRun[]>()
  for (const row of rows) {
    const key = [row.productClass, row.model, row.purpose, row.workload].join('::')
    groups.set(key, [...(groups.get(key) ?? []), row])
  }
  return [...groups.entries()]
    .map(([key, group]) => {
      const [productClass, model, purpose, workload] = key.split('::') as [
        ProductClass,
        string,
        RunPurpose,
        string,
      ]
      const exemplar = group[0]
      const aggregate = aggregateRuns(group)
      const estimatedCents = group.reduce(
        (sum, row) => sum + (row.estimatedCents ?? 0),
        0,
      )
      return {
        productClass,
        model,
        purpose,
        workload,
        expectedModel: exemplar.expectedModel,
        reasoningLevel: exemplar.reasoningLevel,
        expectedReasoning: exemplar.expectedReasoning,
        modelFit: exemplar.modelFit,
        runs: aggregate.runs,
        successfulWorkflows: aggregate.successfulWorkflows,
        inputTokens: aggregate.inputTokens,
        outputTokens: aggregate.outputTokens,
        cachedTokens: aggregate.cachedTokens,
        unknownCachedTokenRuns: aggregate.unknownCachedTokenRuns,
        estimatedCents,
        costPerSuccessfulWorkflowCents:
          aggregate.successfulWorkflows > 0
            ? Math.round(estimatedCents / aggregate.successfulWorkflows)
            : null,
        policyDrift: exemplar.modelFit === 'drift',
        unknownPrice:
          model !== 'No model (static)' &&
          model !== 'Unknown (not recorded)' &&
          !knownPriceModel(model),
      }
    })
    .sort((a, b) => b.estimatedCents - a.estimatedCents || b.runs - a.runs)
}

export function parseCostCapacityMonth(month: string | undefined, now = new Date()) {
  const currentParts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      month: '2-digit',
      timeZone: 'America/New_York',
      year: 'numeric',
    })
      .formatToParts(now)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  )
  const fallback = `${currentParts.year}-${currentParts.month}`
  const normalized = month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? month : fallback
  const [year, monthNumber] = normalized.split('-').map(Number)
  const start = newYorkMidnightUtc(year, monthNumber - 1, 1)
  const naturalEnd = newYorkMidnightUtc(year, monthNumber, 1)
  const end = naturalEnd.getTime() > now.getTime() ? now : naturalEnd
  return { month: normalized, start, end }
}

function newYorkMidnightUtc(year: number, monthIndex: number, day: number) {
  const guess = new Date(Date.UTC(year, monthIndex, day))
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
      minute: '2-digit',
      month: '2-digit',
      second: '2-digit',
      timeZone: 'America/New_York',
      year: 'numeric',
    })
      .formatToParts(guess)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  )
  const representedAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  )
  return new Date(guess.getTime() - (representedAsUtc - guess.getTime()))
}

export function buildCostCapacitySnapshot(input: {
  month: string
  start: Date
  end: Date
  now: Date
  suiteRows: CostCapacityRun[]
  finderRows: CostCapacityRun[]
  finderIssue: string | null
  provider: Record<ProductClass, ProviderProductCost>
  providerCostsAt: string | null
  rowsTruncated?: boolean
  product?: ProductClass
}): CostCapacitySnapshot {
  const productClasses: ProductClass[] = input.product ? [input.product] : ['suite', 'finder']
  const rows = [...input.suiteRows, ...input.finderRows].filter(row => productClasses.includes(row.productClass)).sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  )
  const estimatedCents = rows.reduce(
    (sum, row) => sum + (row.estimatedCents ?? 0),
    0,
  )
  const actualValues = productClasses.map(product => input.provider[product])
    .map((entry) => entry.actualCents)
    .filter((value): value is number => value !== null)
  const actualCents = actualValues.length === productClasses.length
    ? actualValues.reduce((sum, value) => sum + value, 0)
    : null
  const totals = aggregateRuns(rows)
  const elapsedMs = Math.max(1, input.end.getTime() - input.start.getTime())
  const elapsedDays = Math.max(1 / 24, elapsedMs / (24 * 60 * 60 * 1_000))
  const products = productClasses.map((productClass) => {
    const productRows = rows.filter((row) => row.productClass === productClass)
    const aggregate = aggregateRuns(productRows)
    const productEstimatedCents = productRows.reduce(
      (sum, row) => sum + (row.estimatedCents ?? 0),
      0,
    )
    return {
      productClass,
      runs: aggregate.runs,
      successfulWorkflows: aggregate.successfulWorkflows,
      hardFails: aggregate.hardFails,
      inputTokens: aggregate.inputTokens,
      outputTokens: aggregate.outputTokens,
      cachedTokens: aggregate.cachedTokens,
      unknownCachedTokenRuns: aggregate.unknownCachedTokenRuns,
      customerFacingEstimatedCents: productRows
        .filter((row) => row.costClass === 'customer_facing')
        .reduce((sum, row) => sum + (row.estimatedCents ?? 0), 0),
      internalEstimatedCents: productRows
        .filter((row) => row.costClass === 'internal')
        .reduce((sum, row) => sum + (row.estimatedCents ?? 0), 0),
      estimatedCents: productEstimatedCents,
      actualCents: input.provider[productClass].actualCents,
      costPerSuccessfulWorkflowCents:
        aggregate.successfulWorkflows > 0
          ? Math.round(productEstimatedCents / aggregate.successfulWorkflows)
          : null,
    }
  })
  const byModel = groupByModel(rows)
  const coverageHoles: string[] = []
  if (productClasses.includes('finder') && input.finderIssue) coverageHoles.push(input.finderIssue)
  if (rows.some((row) => row.productClass === 'finder' && row.cachedTokens === null)) {
    coverageHoles.push('Finder cached-input tokens are not recorded yet; those cells remain unavailable.')
  }
  for (const productClass of productClasses) {
    const provider = input.provider[productClass]
    if (provider.issue) coverageHoles.push(provider.issue)
  }
  if (input.rowsTruncated) {
    coverageHoles.push(`Monthly telemetry exceeded ${MAX_MONTHLY_ROWS} rows; totals are partial.`)
  }
  const alerts = [
    ...byModel
      .filter((row) => row.unknownPrice)
      .map((row) => `${row.productClass}: ${row.model} has no approved estimate price.`),
    ...byModel
      .filter((row) => row.policyDrift)
      .map((row) => `${row.productClass}: ${row.workload} ran on ${row.model}; the ${row.purpose} policy expects ${row.expectedModel}.`),
  ]
  for (const product of products) {
    if (product.runs > 0 && product.hardFails / product.runs >= 0.2) {
      alerts.push(`${product.productClass}: hard failures are at least 20% of recorded runs.`)
    }
  }

  return {
    month: input.month,
    monthLabel: input.start.toLocaleDateString('en-US', {
      month: 'long',
      timeZone: 'UTC',
      year: 'numeric',
    }),
    generatedAt: input.now.toISOString(),
    telemetryAt: rows[0]?.startedAt ?? null,
    providerCostsAt: input.providerCostsAt,
    rowsTruncated: Boolean(input.rowsTruncated),
    telemetryAvailable: !(productClasses.includes('finder') && input.finderIssue),
    providerBalance: {
      cents: null,
      basis: 'unavailable',
      billingUrl: 'https://platform.openai.com/settings/organization/billing/overview',
      note: 'OpenAI does not expose an authoritative prepaid-credit balance through the documented Usage or Costs APIs. Check Billing; this dashboard does not scrape it.',
    },
    totals: { ...totals, estimatedCents, actualCents },
    products,
    rates: {
      elapsedDays,
      runsPerDay: totals.runs / elapsedDays,
      tokensPerDay: (totals.inputTokens + totals.outputTokens) / elapsedDays,
      estimatedCentsPerDay: estimatedCents / elapsedDays,
      actualCentsPerDay: actualCents === null ? null : actualCents / elapsedDays,
    },
    byModel,
    modelPolicies: productClasses.flatMap(productClass => (['default', 'escalated', 'utility', 'lab'] as RunPurpose[]).map((purpose) => {
      const policy = policyForPurpose(purpose, productClass)
      return {
        productClass,
        purpose,
        policyKey: policy.key,
        model: policy.modelId,
        reasoning: policy.reasoning,
        job: policy.purpose,
      }
    })),
    recentRuns: rows.slice(0, 50),
    coverageHoles: [...new Set(coverageHoles)],
    alerts: [...new Set(alerts)],
    provider: input.provider,
  }
}

function configuredProjectIds(productClass: ProductClass) {
  const key =
    productClass === 'suite'
      ? 'NIC_NAC_OPENAI_SUITE_PROJECT_IDS'
      : 'NIC_NAC_OPENAI_FINDER_PROJECT_IDS'
  return (process.env[key] ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

async function readOpenAICosts(
  productClass: ProductClass,
  start: Date,
  end: Date,
): Promise<ProviderProductCost> {
  const projectIds = configuredProjectIds(productClass)
  if (!process.env.OPENAI_ADMIN_KEY?.trim()) {
    return {
      actualCents: null,
      issue: 'OpenAI actual costs are unavailable because the read-only admin key is not configured.',
      projectIdsConfigured: projectIds.length,
    }
  }
  if (!projectIds.length) {
    return {
      actualCents: null,
      issue: `OpenAI actual costs for ${productClass} are unavailable because no project IDs are mapped to that spend class.`,
      projectIdsConfigured: 0,
    }
  }

  let page: string | null = null
  let dollars = 0
  try {
    do {
      const url = new URL('https://api.openai.com/v1/organization/costs')
      url.searchParams.set('start_time', String(Math.floor(start.getTime() / 1_000)))
      url.searchParams.set('end_time', String(Math.floor(end.getTime() / 1_000)))
      url.searchParams.set('bucket_width', '1d')
      url.searchParams.set('limit', '31')
      url.searchParams.append('group_by', 'project_id')
      for (const projectId of projectIds) url.searchParams.append('project_ids', projectId)
      if (page) url.searchParams.set('page', page)
      const response = await fetch(url, {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${process.env.OPENAI_ADMIN_KEY.trim()}` },
      })
      if (!response.ok) throw new Error(`OpenAI Costs API returned HTTP ${response.status}`)
      const payload = (await response.json()) as {
        data?: Array<{ results?: Array<{ amount?: { value?: number | string } }> }>
        has_more?: boolean
        next_page?: string | null
      }
      for (const bucket of payload.data ?? []) {
        for (const result of bucket.results ?? []) {
          const amount = Number(result.amount?.value ?? 0)
          if (Number.isFinite(amount)) dollars += amount
        }
      }
      page = payload.has_more ? payload.next_page ?? null : null
    } while (page)
    return {
      actualCents: dollarsToIntegerCents(dollars),
      issue: null,
      projectIdsConfigured: projectIds.length,
    }
  } catch (error) {
    return {
      actualCents: null,
      issue: `${productClass}: ${error instanceof Error ? error.message : 'OpenAI Costs API request failed.'}`,
      projectIdsConfigured: projectIds.length,
    }
  }
}

async function readFinderRows(start: Date, end: Date) {
  const token = process.env.SPARKLE_FINDER_CONTROL_CENTER_USAGE_TOKEN?.trim()
  const baseUrl =
    process.env.SPARKLE_FINDER_CONTROL_CENTER_USAGE_URL?.trim() ||
    `https://yoursparklefinder.com${FINDER_USAGE_PATH}`
  if (!token) {
    return {
      rows: [] as CostCapacityRun[],
      issue: 'Sparkle Finder telemetry is unavailable because the read-only Finder bridge token is not configured.',
      truncated: false,
    }
  }
  try {
    const url = new URL(baseUrl)
    url.searchParams.set('start', start.toISOString())
    url.searchParams.set('end', end.toISOString())
    const response = await fetch(url, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) throw new Error(`Finder telemetry bridge returned HTTP ${response.status}`)
    const payload = (await response.json()) as {
      rows?: FinderRunRow[]
      truncated?: boolean
    }
    return {
      rows: (payload.rows ?? []).map(normalizeFinderRun),
      issue: null,
      truncated: Boolean(payload.truncated),
    }
  } catch (error) {
    return {
      rows: [] as CostCapacityRun[],
      issue: error instanceof Error ? error.message : 'Finder telemetry bridge failed.',
      truncated: false,
    }
  }
}

export async function readCostCapacityRuns(
  supabase: Pick<SupabaseClient, 'from'>,
  month: string | undefined,
  now = new Date(),
  product?: ProductClass,
) {
  const range = parseCostCapacityMonth(month, now)
  const suitePromise = product === 'finder' ? Promise.resolve({ data: [], error: null }) : supabase
    .from('nic_nac_runs')
    .select(
      'run_id,product,surface,model,model_provider,model_policy,reasoning_level,routed_intents,workflow_type,status,input_tokens,output_tokens,cache_read_tokens,estimated_cost_cents,hard_fail_phrase_count,created_at',
    )
    .gte('created_at', range.start.toISOString())
    .lt('created_at', range.end.toISOString())
    .order('created_at', { ascending: false })
    .limit(MAX_MONTHLY_ROWS + 1)
  const [suiteResult, finder] = await Promise.all([
    suitePromise,
    product === 'suite' ? Promise.resolve({ rows: [] as CostCapacityRun[], issue: null, truncated: false }) : readFinderRows(range.start, range.end),
  ])
  if (suiteResult.error) throw suiteResult.error
  const suiteRaw = (suiteResult.data ?? []) as SuiteRunRow[]
  return {
    ...range,
    suiteRows: suiteRaw.slice(0, MAX_MONTHLY_ROWS).map(normalizeSuiteRun),
    finderRows: finder.rows.slice(0, MAX_MONTHLY_ROWS),
    finderIssue: finder.issue,
    truncatedByProduct: {
      suite: suiteRaw.length > MAX_MONTHLY_ROWS,
      finder: finder.truncated || finder.rows.length > MAX_MONTHLY_ROWS,
    },
    rowsTruncated:
      suiteRaw.length > MAX_MONTHLY_ROWS || finder.truncated || finder.rows.length > MAX_MONTHLY_ROWS,
  }
}

export async function getNicNacCostCapacity(
  supabase: Pick<SupabaseClient, 'from'>,
  month?: string,
  now = new Date(),
  product?: ProductClass,
) {
  const telemetry = await readCostCapacityRuns(supabase, month, now, product)
  const unselectedProvider = { actualCents: null, issue: null, projectIdsConfigured: 0 }
  const [suiteProvider, finderProvider] = await Promise.all([
    product === 'finder' ? unselectedProvider : readOpenAICosts('suite', telemetry.start, telemetry.end),
    product === 'suite' ? unselectedProvider : readOpenAICosts('finder', telemetry.start, telemetry.end),
  ])
  const provider = { suite: suiteProvider, finder: finderProvider }
  const providerCostsAt = (product ? [provider[product]] : Object.values(provider)).some((entry) => entry.actualCents !== null)
    ? now.toISOString()
    : null
  return buildCostCapacitySnapshot({
    ...telemetry,
    product,
    rowsTruncated: product ? telemetry.truncatedByProduct[product] : telemetry.rowsTruncated,
    now,
    provider,
    providerCostsAt,
  })
}

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function formatCostCapacityCsv(rows: CostCapacityRun[]) {
  const header = [
    'product_class',
    'cost_class',
    'surface',
    'workload',
    'model',
    'expected_model',
    'reasoning_level',
    'expected_reasoning',
    'purpose',
    'policy_key',
    'model_fit',
    'run_id',
    'tokens_in',
    'tokens_out',
    'cached_tokens',
    'estimated_cents',
    'actual_cents',
    'success',
    'hard_fail',
    'started_at_america_new_york',
  ]
  const body = rows.map((row) => [
    row.productClass,
    row.costClass,
    row.surface,
    row.workload,
    row.model,
    row.expectedModel,
    row.reasoningLevel,
    row.expectedReasoning,
    row.purpose,
    row.policyKey,
    row.modelFit,
    row.runId,
    row.inputTokens,
    row.outputTokens,
    row.cachedTokens,
    row.estimatedCents,
    row.actualCents,
    row.successful,
    row.hardFail,
    new Intl.DateTimeFormat('en-CA', {
      dateStyle: 'short',
      timeStyle: 'medium',
      timeZone: 'America/New_York',
    }).format(new Date(row.startedAt)),
  ])
  return [header, ...body].map((line) => line.map(csvCell).join(',')).join('\r\n')
}
