import { randomUUID } from 'node:crypto'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import type { UIMessage } from 'ai'

import { loadCanonicalHistory } from '@/lib/nic-nac/persistence'
import { getReviewerSmokePersona } from '@/lib/reviewer-smoke/config'
import { resetReviewerSmokeSession } from '@/lib/reviewer-smoke/session'
import {
  approveLatestTool,
  findApprovalTarget,
  getMissingRemoveListingSmokeEnv,
} from './smoke-nic-nac-remove-listing'

const DEFAULT_APP_URL = 'https://www.yoursparklesuite.com'
const MAX_HISTORY_WAIT_MS = 75_000
const HISTORY_POLL_MS = 1_000
const SMOKE_PREFIX = 'Codex Trade Decision Smoke'

type Env = Record<string, string | undefined>
type Supabase = SupabaseClient
type UiPart = UIMessage['parts'][number] & {
  type?: string
  text?: string
  state?: string
  input?: unknown
  output?: unknown
  toolCallId?: string
  toolName?: string
  approval?: { id?: string; approved?: boolean }
}

type Rep = {
  id: string
  email: string
  displayName?: string
  publicSiteSlug?: string | null
}

type SeededRequestTarget = {
  requestId: string
  listingId: string
  designId: string
  itemNumber: string
  designName: string
  customerName: string
}

type SeededDecisionTargets = {
  collectionId: string
  collectionName: string
  approve: SeededRequestTarget
  reject: SeededRequestTarget
}

type TurnResult = {
  turn: string
  runId: string | null
  observedTools: string[]
  assistantText: string
}

type TradeRequestDecisionSmokeStatus =
  | 'passed'
  | 'missing_env'
  | 'api_failed'
  | 'tool_not_observed'
  | 'approval_not_found'
  | 'approval_output_timeout'
  | 'database_assertion_failed'
  | 'public_site_assertion_failed'
  | 'cleanup_failed'

type TradeRequestDecisionSmokeResult = {
  ok: boolean
  status: TradeRequestDecisionSmokeStatus
  appUrl?: string
  conversationId?: string
  rep?: Rep
  runTag?: string
  targets?: SeededDecisionTargets
  turns?: TurnResult[]
  cleanup?: { deletedRows: Record<string, number>; error?: string }
  missingEnv?: string[]
  message: string
}

const HARD_FAIL_PATTERNS = [
  /didn['’]t produce a response that time/i,
  /i can['’]t actually (approve|reject|change|update)/i,
  /i['’]m not able to (approve|reject|change|update)/i,
  /not able to access (the )?trade request tool/i,
  /only have notes access/i,
  /approve it manually/i,
  /reject it manually/i,
  /log into your workspace and (approve|reject)/i,
  /paste (this|it) into/i,
]

export const getMissingTradeRequestDecisionSmokeEnv = getMissingRemoveListingSmokeEnv

function getSmokeAppUrl(env: Env) {
  return (
    env.SPARKLE_NIC_NAC_SMOKE_APP_URL?.trim() ||
    DEFAULT_APP_URL
  ).replace(/\/+$/, '')
}

function withVercelProtectionBypass(rawUrl: string, env: Env) {
  const bypass =
    env.VERCEL_PROTECTION_BYPASS?.trim() ||
    env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim()
  if (!bypass) return rawUrl

  const url = new URL(rawUrl)
  url.searchParams.set('x-vercel-set-bypass-cookie', 'true')
  url.searchParams.set('x-vercel-protection-bypass', bypass)
  return url.toString()
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function assertNoHardFails(text: string) {
  const failures = HARD_FAIL_PATTERNS.filter((pattern) => pattern.test(text))
  if (failures.length) {
    throw new Error(
      `Hard-fail phrase detected: ${failures.map((pattern) => pattern.source).join(', ')}`,
    )
  }
}

async function createReviewerSessionCookie(env: Env) {
  const persona = getReviewerSmokePersona(env as NodeJS.ProcessEnv)
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase auth environment is incomplete.')
  }

  const client = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error } = await client.auth.signInWithPassword({
    email: persona.email,
    password: persona.password,
  })
  if (error) throw new Error(`Reviewer smoke sign-in failed: ${error.message}`)

  const {
    data: { session },
  } = await client.auth.getSession()
  if (!session) throw new Error('Reviewer smoke sign-in did not return a session.')

  const supabaseRef = new URL(supabaseUrl).hostname.split('.')[0]
  return {
    cookie: `sb-${supabaseRef}-auth-token=${encodeURIComponent(
      JSON.stringify(session),
    )}`,
  }
}

async function fetchNicNacMe(appUrl: string, env: Env, cookie: string): Promise<Rep> {
  const response = await fetch(
    withVercelProtectionBypass(`${appUrl}/api/nic-nac/me`, env),
    { headers: { cookie } },
  )
  if (!response.ok) {
    throw new Error(`/api/nic-nac/me returned ${response.status}: ${await response.text()}`)
  }
  const payload = (await response.json()) as {
    rep?: {
      id?: string
      email?: string
      display_name?: string
      public_site_slug?: string | null
    }
  }
  if (!payload.rep?.id || !payload.rep.email) {
    throw new Error('/api/nic-nac/me did not return a usable rep.')
  }
  return {
    id: payload.rep.id,
    email: payload.rep.email,
    displayName: payload.rep.display_name,
    publicSiteSlug: payload.rep.public_site_slug ?? null,
  }
}

async function postNicNacTurn(
  appUrl: string,
  env: Env,
  cookie: string,
  body: { conversationId: string; messages: UIMessage[] },
) {
  const response = await fetch(
    withVercelProtectionBypass(`${appUrl}/api/nic-nac`, env),
    {
      method: 'POST',
      headers: {
        cookie,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        conversationId: body.conversationId,
        messages: body.messages,
        mode: 'workspace',
      }),
    },
  )
  const responseText = await response.text()
  if (!response.ok) {
    throw new Error(`/api/nic-nac returned ${response.status}: ${responseText.slice(0, 800)}`)
  }
  return response.headers.get('x-nic-nac-run-id')
}

async function waitForCanonicalHistory(input: {
  supabase: Supabase
  conversationId: string
  expectedAssistantCount: number
}) {
  const startedAt = Date.now()
  let latest: UIMessage[] = []
  while (Date.now() - startedAt < MAX_HISTORY_WAIT_MS) {
    latest = await loadCanonicalHistory(input.supabase, input.conversationId)
    const assistantCount = latest.filter((message) => message.role === 'assistant').length
    if (assistantCount >= input.expectedAssistantCount) return latest
    await sleep(HISTORY_POLL_MS)
  }
  throw new Error(
    `Timed out waiting for assistant turn ${input.expectedAssistantCount}. Last canonical message count=${latest.length}.`,
  )
}

async function waitForApprovedToolOutput(input: {
  supabase: Supabase
  conversationId: string
  expectedAssistantCount: number
  toolName: string
  approvalId: string
}) {
  const startedAt = Date.now()
  let latest: UIMessage[] = []
  let latestState = 'missing'
  while (Date.now() - startedAt < MAX_HISTORY_WAIT_MS) {
    latest = await loadCanonicalHistory(input.supabase, input.conversationId)
    const assistantCount = latest.filter((message) => message.role === 'assistant').length
    if (assistantCount >= input.expectedAssistantCount) {
      for (const message of latest.filter((m) => m.role === 'assistant').reverse()) {
        for (const part of message.parts ?? []) {
          const toolPart = part as UiPart
          if (toolPart.type !== `tool-${input.toolName}`) continue
          if (toolPart.approval?.id !== input.approvalId) continue
          latestState = toolPart.state ?? 'missing-state'
          if (toolPart.state === 'output-available') return latest
          if (toolPart.state === 'output-error') {
            throw new Error(
              `Approval tool ${input.toolName} returned output-error for ${input.approvalId}.`,
            )
          }
        }
      }
    }
    await sleep(HISTORY_POLL_MS)
  }
  throw new Error(
    `approval output timeout: ${input.toolName} ${input.approvalId} never reached output-available; latest state=${latestState}; canonical message count=${latest.length}.`,
  )
}

function extractAssistantText(messages: UIMessage[]) {
  return messages
    .filter((message) => message.role === 'assistant')
    .flatMap((message) => message.parts ?? [])
    .map((part) => {
      const toolPart = part as UiPart
      if (toolPart.type === 'text') return toolPart.text ?? ''
      if (toolPart.output && typeof toolPart.output === 'object') {
        return JSON.stringify(toolPart.output)
      }
      return ''
    })
    .filter(Boolean)
    .join('\n')
}

function getLatestAssistantToolNames(messages: UIMessage[]) {
  const latestAssistant = [...messages].reverse().find((message) => message.role === 'assistant')
  if (!latestAssistant) return new Set<string>()
  const observed = new Set<string>()
  for (const part of latestAssistant.parts ?? []) {
    const toolPart = part as UiPart
    if (!toolPart.type?.startsWith('tool-')) continue
    if (
      toolPart.state !== 'output-available' &&
      toolPart.state !== 'approval-requested'
    ) {
      continue
    }
    observed.add(toolPart.type.slice('tool-'.length))
  }
  return observed
}

function getObservedToolNames(messages: UIMessage[]) {
  const observed = new Set<string>()
  for (const message of messages) {
    if (message.role !== 'assistant') continue
    for (const part of message.parts ?? []) {
      const toolPart = part as UiPart
      if (!toolPart.type?.startsWith('tool-')) continue
      if (
        toolPart.state !== 'output-available' &&
        toolPart.state !== 'approval-requested'
      ) {
        continue
      }
      observed.add(toolPart.type.slice('tool-'.length))
    }
  }
  return observed
}

async function sendTurn(input: {
  appUrl: string
  env: Env
  cookie: string
  supabase: Supabase
  conversationId: string
  currentMessages: UIMessage[]
  text: string
  expectedAssistantCount: number
  requiredTools?: string[]
  turns: TurnResult[]
}) {
  const nextMessages: UIMessage[] = [
    ...input.currentMessages,
    {
      id: `user-${randomUUID()}`,
      role: 'user',
      parts: [{ type: 'text', text: input.text }],
    },
  ]

  const runId = await postNicNacTurn(input.appUrl, input.env, input.cookie, {
    conversationId: input.conversationId,
    messages: nextMessages,
  })
  const history = await waitForCanonicalHistory({
    supabase: input.supabase,
    conversationId: input.conversationId,
    expectedAssistantCount: input.expectedAssistantCount,
  })
  const assistantText = extractAssistantText(history)
  assertNoHardFails(assistantText)
  const observedTools = [...getLatestAssistantToolNames(history)]
  for (const toolName of input.requiredTools ?? []) {
    if (!observedTools.includes(toolName)) {
      throw new Error(
        `Did not observe ${toolName} in latest turn. Observed latest-turn tools: ${observedTools.join(', ')}`,
      )
    }
  }
  input.turns.push({
    turn: input.text,
    runId,
    observedTools,
    assistantText: assistantText.slice(-1200),
  })
  return history
}

async function approveTurn(input: {
  appUrl: string
  env: Env
  cookie: string
  supabase: Supabase
  conversationId: string
  messages: UIMessage[]
  toolName: string
  expectedAssistantCount: number
  turns: TurnResult[]
}) {
  const approval = findApprovalTarget(input.messages, input.toolName)
  if (!approval) {
    throw new Error(`No approval-requested part found for ${input.toolName}.`)
  }
  const approvedMessages = approveLatestTool(input.messages, approval)
  const runId = await postNicNacTurn(input.appUrl, input.env, input.cookie, {
    conversationId: input.conversationId,
    messages: approvedMessages,
  })
  const history = await waitForApprovedToolOutput({
    supabase: input.supabase,
    conversationId: input.conversationId,
    expectedAssistantCount: input.expectedAssistantCount,
    toolName: input.toolName,
    approvalId: approval.approvalId,
  })
  const assistantText = extractAssistantText(history)
  assertNoHardFails(assistantText)
  input.turns.push({
    turn: `approve:${input.toolName}`,
    runId,
    observedTools: [...getObservedToolNames(history)],
    assistantText: assistantText.slice(-1200),
  })
  return history
}

async function seedTradeRequestTargets(
  supabase: Supabase,
  repId: string,
  runTag: string,
): Promise<SeededDecisionTargets> {
  const collectionName = `${SMOKE_PREFIX} Collection ${runTag}`
  const { data: collection, error: collectionError } = await supabase
    .from('collections')
    .insert({ name: collectionName })
    .select('id')
    .single()
  if (collectionError) throw collectionError

  const seeds = [
    {
      itemNumber: `NK${runTag}A`,
      designName: `${SMOKE_PREFIX} Approve Necklace ${runTag}`,
      customerName: 'Morgan Trade Smoke',
      typePrefix: 'NK',
    },
    {
      itemNumber: `ER${runTag}R`,
      designName: `${SMOKE_PREFIX} Reject Earrings ${runTag}`,
      customerName: 'Taylor Trade Smoke',
      typePrefix: 'ER',
    },
  ] as const

  const { data: designs, error: designError } = await supabase
    .from('jewelry_designs')
    .insert(
      seeds.map((seed) => ({
        item_number: seed.itemNumber,
        design_name: seed.designName,
        collection_id: collection.id,
        material: 'Rhodium Plating',
        main_stone: 'Synthetic smoke crystal',
        bp_msrp: seed.typePrefix === 'NK' ? 42 : 38,
        canonical_photo_url: null,
        type_prefix: seed.typePrefix,
      })),
    )
    .select('id,item_number')
  if (designError) throw designError

  const designByItem = new Map((designs ?? []).map((row) => [row.item_number as string, row.id as string]))

  const { data: listings, error: listingError } = await supabase
    .from('trade_listings')
    .insert(
      seeds.map((seed) => ({
        rep_id: repId,
        design_id: designByItem.get(seed.itemNumber),
        listing_source: 'catalog',
        status: 'pending_trade',
        rep_notes: `${SMOKE_PREFIX} listing ${seed.itemNumber}`,
        trade_preferences: 'Synthetic trade request decision smoke.',
        uses_canonical_photo: true,
        listed_at: new Date().toISOString(),
      })),
    )
    .select('id,design_id')
  if (listingError) throw listingError

  if (!listings || listings.length !== 2) {
    throw new Error('database assertion failed: expected two seeded listings.')
  }

  const listingByDesign = new Map((listings ?? []).map((row) => [row.design_id as string, row.id as string]))

  const targets = seeds.map((seed) => {
    const designId = designByItem.get(seed.itemNumber)
    const listingId = designId ? listingByDesign.get(designId) : undefined
    if (!designId || !listingId) {
      throw new Error(`database assertion failed: missing seed mapping for ${seed.itemNumber}.`)
    }
    return {
      designId,
      listingId,
      itemNumber: seed.itemNumber,
      designName: seed.designName,
      customerName: seed.customerName,
    }
  })

  const { data: requests, error: requestError } = await supabase
    .from('trade_requests')
    .insert(
      targets.map((target) => ({
        listing_id: target.listingId,
        customer_name: target.customerName,
        customer_description: `Synthetic pending request for ${target.itemNumber}.`,
        offered_family: collectionName,
        offered_type: target.itemNumber.slice(0, 2),
        manual_review_requested: false,
        status: 'pending',
      })),
    )
    .select('id,listing_id')
  if (requestError) throw requestError

  const requestByListing = new Map((requests ?? []).map((row) => [row.listing_id as string, row.id as string]))
  const approveRequestId = requestByListing.get(targets[0].listingId)
  const rejectRequestId = requestByListing.get(targets[1].listingId)
  if (!approveRequestId || !rejectRequestId) {
    throw new Error('database assertion failed: expected two seeded trade requests.')
  }

  return {
    collectionId: collection.id,
    collectionName,
    approve: { ...targets[0], requestId: approveRequestId },
    reject: { ...targets[1], requestId: rejectRequestId },
  }
}

async function cleanupTargets(supabase: Supabase, targets?: SeededDecisionTargets) {
  const deletedRows: Record<string, number> = {
    trade_swaps: 0,
    trade_fulfillment: 0,
    trade_requests: 0,
    trade_listings: 0,
    jewelry_designs: 0,
    collections: 0,
  }
  if (!targets) return { deletedRows }
  const requestIds = [targets.approve.requestId, targets.reject.requestId]
  const listingIds = [targets.approve.listingId, targets.reject.listingId]
  const designIds = [targets.approve.designId, targets.reject.designId]

  const swapDelete = await supabase
    .from('trade_swaps')
    .delete()
    .in('request_id', requestIds)
    .select('id')
  if (swapDelete.error) throw swapDelete.error
  deletedRows.trade_swaps = swapDelete.data?.length ?? 0

  const fulfillmentDelete = await supabase
    .from('trade_fulfillment')
    .delete()
    .in('request_id', requestIds)
    .select('id')
  if (fulfillmentDelete.error) throw fulfillmentDelete.error
  deletedRows.trade_fulfillment = fulfillmentDelete.data?.length ?? 0

  const requestDelete = await supabase
    .from('trade_requests')
    .delete()
    .in('id', requestIds)
    .select('id')
  if (requestDelete.error) throw requestDelete.error
  deletedRows.trade_requests = requestDelete.data?.length ?? 0

  const listingDelete = await supabase
    .from('trade_listings')
    .delete()
    .in('id', listingIds)
    .select('id')
  if (listingDelete.error) throw listingDelete.error
  deletedRows.trade_listings = listingDelete.data?.length ?? 0

  const designDelete = await supabase
    .from('jewelry_designs')
    .delete()
    .in('id', designIds)
    .select('id')
  if (designDelete.error) throw designDelete.error
  deletedRows.jewelry_designs = designDelete.data?.length ?? 0

  const collectionDelete = await supabase
    .from('collections')
    .delete()
    .eq('id', targets.collectionId)
    .select('id')
  if (collectionDelete.error) throw collectionDelete.error
  deletedRows.collections = collectionDelete.data?.length ?? 0

  return { deletedRows }
}

async function getRequestRow(supabase: Supabase, requestId: string) {
  const { data, error } = await supabase
    .from('trade_requests')
    .select('id,status,rejection_reason,rep_notes')
    .eq('id', requestId)
    .maybeSingle()
  if (error) throw error
  return data as {
    id: string
    status: string
    rejection_reason: string | null
    rep_notes: string | null
  } | null
}

async function getListingRow(supabase: Supabase, repId: string, listingId: string) {
  const { data, error } = await supabase
    .from('trade_listings')
    .select('id,rep_id,status')
    .eq('id', listingId)
    .eq('rep_id', repId)
    .maybeSingle()
  if (error) throw error
  return data as { id: string; rep_id: string; status: string } | null
}

async function getFulfillmentRow(supabase: Supabase, requestId: string) {
  const { data, error } = await supabase
    .from('trade_fulfillment')
    .select('id,request_id,fulfillment_status')
    .eq('request_id', requestId)
    .maybeSingle()
  if (error) throw error
  return data as {
    id: string
    request_id: string
    fulfillment_status: string
  } | null
}

async function getDecisionWorkflow(
  supabase: Supabase,
  repId: string,
  conversationId: string,
  requestId: string,
) {
  const { data, error } = await supabase
    .from('nic_nac_trade_workflows')
    .select('id,status,phase,approval_state,known_fields,db_assertions,public_proof')
    .eq('rep_id', repId)
    .eq('conversation_id', conversationId)
    .eq('workflow_type', 'trade_request_decision')
    .order('updated_at', { ascending: false })
  if (error) throw error
  const rows = (data ?? []) as Array<{
    id: string
    status: string
    phase: string
    approval_state: string
    known_fields: Record<string, unknown>
    db_assertions: Record<string, unknown>
    public_proof: Record<string, unknown>
  }>
  return rows.find((row) => row.known_fields?.requestId === requestId) ?? null
}

async function fetchPublicTradeBoardPayload(appUrl: string, env: Env, repId: string) {
  const response = await fetch(
    withVercelProtectionBypass(
      `${appUrl}/api/amethyst/trade-board?c=${encodeURIComponent(repId)}`,
      env,
    ),
  )
  if (!response.ok) {
    throw new Error(`/api/amethyst/trade-board returned ${response.status}: ${await response.text()}`)
  }
  return (await response.json()) as { listings?: Array<{ id?: string; name?: string }> }
}

async function assertPublicListingState(input: {
  appUrl: string
  env: Env
  repId: string
  listingId: string
  visible: boolean
}) {
  const payload = await fetchPublicTradeBoardPayload(input.appUrl, input.env, input.repId)
  const ids = new Set((payload.listings ?? []).map((listing) => listing.id))
  const actualVisible = ids.has(input.listingId)
  if (actualVisible !== input.visible) {
    throw new Error(
      `public site assertion failed: listing ${input.listingId} visible=${actualVisible}, expected ${input.visible}.`,
    )
  }
}

async function verifyApproveState(input: {
  supabase: Supabase
  repId: string
  conversationId: string
  target: SeededRequestTarget
}) {
  const request = await getRequestRow(input.supabase, input.target.requestId)
  const listing = await getListingRow(input.supabase, input.repId, input.target.listingId)
  const fulfillment = await getFulfillmentRow(input.supabase, input.target.requestId)
  if (request?.status !== 'approved') {
    throw new Error(`database assertion failed: approve request status was ${request?.status}.`)
  }
  if (listing?.status !== 'traded') {
    throw new Error(`database assertion failed: approve listing status was ${listing?.status}.`)
  }
  if (fulfillment?.fulfillment_status !== 'approved') {
    throw new Error('database assertion failed: approve fulfillment row missing or wrong status.')
  }
  const workflow = await getDecisionWorkflow(
    input.supabase,
    input.repId,
    input.conversationId,
    input.target.requestId,
  )
  if (!workflow) throw new Error('database assertion failed: approve workflow row missing.')
  if (
    workflow.status !== 'completed' ||
    workflow.phase !== 'completed' ||
    workflow.approval_state !== 'approved'
  ) {
    throw new Error(
      `database assertion failed: approve workflow not completed/approved (${workflow.status}/${workflow.phase}/${workflow.approval_state}).`,
    )
  }
  if (workflow.db_assertions?.fulfillment == null) {
    throw new Error('database assertion failed: approve workflow missing fulfillment assertion.')
  }
  if (workflow.public_proof?.tradeBoardListingShouldBeHidden !== true) {
    throw new Error('database assertion failed: approve workflow missing hidden public proof.')
  }
}

async function verifyRejectState(input: {
  supabase: Supabase
  repId: string
  conversationId: string
  target: SeededRequestTarget
}) {
  const request = await getRequestRow(input.supabase, input.target.requestId)
  const listing = await getListingRow(input.supabase, input.repId, input.target.listingId)
  const fulfillment = await getFulfillmentRow(input.supabase, input.target.requestId)
  if (request?.status !== 'denied') {
    throw new Error(`database assertion failed: reject request status was ${request?.status}.`)
  }
  if (request.rejection_reason !== 'changed_mind') {
    throw new Error(
      `database assertion failed: reject reason was ${request.rejection_reason}.`,
    )
  }
  if (listing?.status !== 'available') {
    throw new Error(`database assertion failed: reject listing status was ${listing?.status}.`)
  }
  if (fulfillment) {
    throw new Error('database assertion failed: reject created a fulfillment row.')
  }
  const workflow = await getDecisionWorkflow(
    input.supabase,
    input.repId,
    input.conversationId,
    input.target.requestId,
  )
  if (!workflow) throw new Error('database assertion failed: reject workflow row missing.')
  if (
    workflow.status !== 'completed' ||
    workflow.phase !== 'completed' ||
    workflow.approval_state !== 'not_required'
  ) {
    throw new Error(
      `database assertion failed: reject workflow not completed/not_required (${workflow.status}/${workflow.phase}/${workflow.approval_state}).`,
    )
  }
  if (workflow.public_proof?.tradeBoardListingShouldBeVisible !== true) {
    throw new Error('database assertion failed: reject workflow missing visible public proof.')
  }
}

function classify(error: unknown): TradeRequestDecisionSmokeStatus {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes('Missing required')) return 'missing_env'
  if (message.includes('Did not observe')) return 'tool_not_observed'
  if (message.includes('No approval-requested')) return 'approval_not_found'
  if (message.includes('approval output timeout')) return 'approval_output_timeout'
  if (message.includes('database assertion failed')) return 'database_assertion_failed'
  if (message.includes('public site assertion failed')) return 'public_site_assertion_failed'
  if (message.includes('cleanup')) return 'cleanup_failed'
  return 'api_failed'
}

export async function runTradeRequestDecisionSmoke(
  env: Env = process.env,
): Promise<TradeRequestDecisionSmokeResult> {
  const missingEnv = getMissingTradeRequestDecisionSmokeEnv(env)
  if (missingEnv.length) {
    return {
      ok: false,
      status: 'missing_env',
      missingEnv,
      message: `Missing required Nic-Nac trade-request decision smoke env: ${missingEnv.join(', ')}`,
    }
  }

  const appUrl = getSmokeAppUrl(env)
  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  await resetReviewerSmokeSession('dashboard_unlocked', supabase as never)
  const session = await createReviewerSessionCookie(env)
  const rep = await fetchNicNacMe(appUrl, env, session.cookie)

  const runTag = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(4, 14)
  const conversationId = randomUUID()
  const turns: TurnResult[] = []
  let messages: UIMessage[] = []
  let targets: SeededDecisionTargets | undefined

  try {
    targets = await seedTradeRequestTargets(supabase, rep.id, runTag)

    messages = await sendTurn({
      appUrl,
      env,
      cookie: session.cookie,
      supabase,
      conversationId,
      currentMessages: messages,
      expectedAssistantCount: 1,
      requiredTools: ['get_trade_requests'],
      turns,
      text:
        `Open my Dance Floor request inbox and list the pending incoming trade requests. ` +
        `I am looking for request ${targets.approve.requestId} from ${targets.approve.customerName} ` +
        `and request ${targets.reject.requestId} from ${targets.reject.customerName}.`,
    })

    messages = await sendTurn({
      appUrl,
      env,
      cookie: session.cookie,
      supabase,
      conversationId,
      currentMessages: messages,
      expectedAssistantCount: 2,
      requiredTools: ['approve_trade'],
      turns,
      text:
        `Approve trade request ${targets.approve.requestId} from ${targets.approve.customerName} for ${targets.approve.itemNumber}. ` +
        `I personally verified that the offered dancer is a ${targets.collectionName} necklace, matching the requested collection and jewelry type. ` +
        'I confirm those facts and give my final approval now. Do not capture the revealed replacement item right now; I will add the received piece later.',
    })

    messages = await approveTurn({
      appUrl,
      env,
      cookie: session.cookie,
      supabase,
      conversationId,
      messages,
      toolName: 'approve_trade',
      expectedAssistantCount: 2,
      turns,
    })

    await verifyApproveState({
      supabase,
      repId: rep.id,
      conversationId,
      target: targets.approve,
    })
    await assertPublicListingState({
      appUrl,
      env,
      repId: rep.id,
      listingId: targets.approve.listingId,
      visible: false,
    })

    messages = await sendTurn({
      appUrl,
      env,
      cookie: session.cookie,
      supabase,
      conversationId,
      currentMessages: messages,
      expectedAssistantCount: 3,
      requiredTools: ['reject_trade'],
      turns,
      text:
        `Reject trade request ${targets.reject.requestId} from ${targets.reject.customerName} for ${targets.reject.itemNumber} ` +
        'for another customer-safe reason: the customer changed their mind. Tell them the request was declined because they no longer want the swap. Add the private note: customer changed mind during smoke.',
    })

    await verifyRejectState({
      supabase,
      repId: rep.id,
      conversationId,
      target: targets.reject,
    })
    await assertPublicListingState({
      appUrl,
      env,
      repId: rep.id,
      listingId: targets.reject.listingId,
      visible: true,
    })

    const cleanup = await cleanupTargets(supabase, targets)
    return {
      ok: true,
      status: 'passed',
      appUrl,
      conversationId,
      rep,
      runTag,
      targets,
      turns,
      cleanup,
      message:
        'Nic-Nac trade-request decision smoke passed through real /api/nic-nac pending-request listing, approval-gated approve_trade with fulfillment/public hidden proof, direct reject_trade with public visible proof, workflow DB assertions, and cleanup.',
    }
  } catch (error) {
    const cleanup: TradeRequestDecisionSmokeResult['cleanup'] = { deletedRows: {} }
    try {
      cleanup.deletedRows = (await cleanupTargets(supabase, targets)).deletedRows
    } catch (cleanupError) {
      cleanup.error = cleanupError instanceof Error ? cleanupError.message : String(cleanupError)
    }
    return {
      ok: false,
      status: classify(error),
      appUrl,
      conversationId,
      rep,
      runTag,
      targets,
      turns,
      cleanup,
      message: error instanceof Error ? error.message : String(error),
    }
  }
}

async function main() {
  config({ path: '.env.local', quiet: true })
  const result = await runTradeRequestDecisionSmoke()
  console.log(JSON.stringify(result, null, 2))
  if (!result.ok) process.exit(1)
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
