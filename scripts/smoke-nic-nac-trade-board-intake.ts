import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import type { UIMessage } from 'ai'

import { loadCanonicalHistory } from '@/lib/nic-nac/persistence'
import { getReviewerSmokePersona } from '@/lib/reviewer-smoke/config'
import { resetReviewerSmokeSession } from '@/lib/reviewer-smoke/session'
import { DEFAULT_DEMO_PASSWORD } from '@/scripts/seed-demo-rep'

const DEFAULT_FIXTURE_DIR = 'C:\\Users\\louis\\sparkle-suite-smoke-assets'
const DEFAULT_APP_URL = 'https://www.yoursparklesuite.com'
const MAX_HISTORY_WAIT_MS = 60_000
const HISTORY_POLL_MS = 1_000

export const HARD_FAIL_PHRASES = [
  'I’m sorry—I didn’t produce a response that time. Please send that again.',
  "I can't actually add listings",
  'Log into your workspace and add it manually',
  'The photo of the earrings needs',
  'Unboxed',
  'Plain background',
  'Packaging is too prominent',
  'Have Louis add it manually on the backend',
  'Without the box or card',
  'just the earrings',
  'outside or clearly apart',
  'Plain surface',
  'incomplete data on file',
  'report this to Louis',
  'photo URL',
  'direct image link',
  'cloud link',
  'escalate this to Louis',
  'backend validation',
  'not under my control',
  'photo quality settings',
  'escalate this to the team',
  'flag this for Louis',
  'preflight stage',
] as const

export const REQUIRED_SMOKE_ASSETS = [
  'ER13229-label.jpg',
  'ER13229-jewelry-boxed-front.jpg',
] as const

export const REQUIRED_OBSERVED_TOOLS = [
  'prepare_trade_board_work',
  'add_listing',
] as const

type RequiredSmokeAsset = (typeof REQUIRED_SMOKE_ASSETS)[number]
type FsExists = Pick<typeof fs, 'existsSync'>
type Env = Record<string, string | undefined>
type UiPart = UIMessage['parts'][number] & {
  type?: string
  text?: string
  mediaType?: string
  url?: string
  state?: string
  output?: unknown
}

export type TradeBoardSmokeAssetsResult =
  | {
      ok: true
      fixtureDir: string
      paths: Record<RequiredSmokeAsset, string>
    }
  | {
      ok: false
      fixtureDir: string
      missing: string[]
    }

export interface TradeBoardIntakeSmokeCase {
  id: string
  message: string
  uploads: string[]
  expect: string[]
  fail: string[]
}

interface DemoSessionCookie {
  cookie: string
  email: string
}

interface SmokeAccount {
  email: string
  password: string
  source: 'demo_env' | 'reviewer_smoke'
}

interface SmokeTurnResult {
  turn: string
  runId: string | null
  assistantText: string
}

interface LatestWorkflowRow {
  id: string
  status: string
  current_phase: string
  created_listing_ids: string[] | null
  created_design_id: string | null
  missing_fields: string[] | null
  hard_blockers: string[] | null
  soft_warnings: string[] | null
}

interface SmokeListingRow {
  id: string
  status: string
  design_id: string
  listing_photo_url: string | null
  uses_canonical_photo: boolean | null
}

interface SmokeDesignRow {
  id: string
  item_number: string
  design_name: string
}

export interface TradeBoardIntakeSmokeRunResult {
  ok: boolean
  status:
    | 'passed'
    | 'missing_assets'
    | 'missing_env'
    | 'api_failed'
    | 'hard_fail_phrase'
    | 'workflow_not_completed'
    | 'tool_not_observed'
    | 'listing_not_verified'
  appUrl?: string
  fixtureDir?: string
  missing?: string[]
  missingEnv?: string[]
  conversationId?: string
  rep?: { id: string; email: string; displayName?: string }
  turns?: SmokeTurnResult[]
  workflow?: LatestWorkflowRow | null
  listingIds?: string[]
  cleanup?: {
    skipped: boolean
    removedListingIds: string[]
    error?: string
  }
  message?: string
}

export function parseTradeBoardIntakeSmokeCases(
  raw: string,
): TradeBoardIntakeSmokeCase[] {
  const cases: TradeBoardIntakeSmokeCase[] = []
  let current: TradeBoardIntakeSmokeCase | null = null
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    if (trimmed.startsWith('CASE ')) {
      current = {
        id: trimmed.slice('CASE '.length).trim(),
        message: '',
        uploads: [],
        expect: [],
        fail: [],
      }
      continue
    }
    if (trimmed === 'END') {
      if (current) cases.push(current)
      current = null
      continue
    }
    if (!current) continue
    const [key, ...rest] = trimmed.split('=')
    const value = rest.join('=').trim()
    if (key === 'message') current.message = value
    if (key === 'upload') current.uploads.push(value)
    if (key === 'expect') current.expect.push(value)
    if (key === 'fail') current.fail.push(value)
  }
  return cases
}

export function findHardFailPhrases(text: string): string[] {
  const normalizedText = text.toLocaleLowerCase()
  return HARD_FAIL_PHRASES.filter((phrase) => {
    if (normalizedText.includes(phrase.toLocaleLowerCase())) return true
    if (phrase === 'Have Louis add it manually on the backend') {
      return normalizedText.includes('have him add it manually on the backend')
    }
    return false
  })
}

export function requireTradeBoardSmokeAssets(
  fixtureDir: string,
  fsLike: FsExists = fs,
): TradeBoardSmokeAssetsResult {
  const paths = Object.fromEntries(
    REQUIRED_SMOKE_ASSETS.map((asset) => [
      asset,
      path.join(fixtureDir, asset),
    ]),
  ) as Record<RequiredSmokeAsset, string>
  const missing = REQUIRED_SMOKE_ASSETS.filter(
    (asset) => !fsLike.existsSync(paths[asset]),
  )

  if (missing.length > 0) {
    return {
      ok: false,
      fixtureDir,
      missing,
    }
  }

  return {
    ok: true,
    fixtureDir,
    paths,
  }
}

export async function runTradeBoardIntakeSmoke(
  env: Env = process.env,
): Promise<TradeBoardIntakeSmokeRunResult> {
  const fixtureDir =
    env.SPARKLE_NIC_NAC_SMOKE_ASSETS?.trim() || DEFAULT_FIXTURE_DIR
  const assets = requireTradeBoardSmokeAssets(fixtureDir)
  if (!assets.ok) {
    return {
      ok: false,
      status: 'missing_assets',
      fixtureDir,
      missing: assets.missing,
      message:
        'Nic-Nac Dance Floor smoke needs the ER13229 label and boxed jewelry fixture photos before live API replay can run.',
    }
  }

  const missingEnv = getMissingLiveSmokeEnv(env)
  if (missingEnv.length > 0) {
    return {
      ok: false,
      status: 'missing_env',
      fixtureDir,
      missingEnv,
      message: 'Nic-Nac Dance Floor smoke is missing required environment.',
    }
  }

  const appUrl = getSmokeAppUrl(env)
  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
  const smokeAccount = await prepareSmokeAccount(env, supabase)
  const session = await createDemoSessionCookie(env, smokeAccount)
  const rep = await fetchNicNacMe(appUrl, env, session.cookie)
  await cleanupPriorSmokeListingsForItem({
    supabase,
    repId: rep.id,
    itemNumber: 'ER13229',
  })
  const conversationId = randomUUID()
  const turns: SmokeTurnResult[] = []
  let messages: UIMessage[] = []

  try {
    messages = await sendTurn({
      appUrl,
      env,
      cookie: session.cookie,
      supabase,
      conversationId,
      currentMessages: messages,
      turn: 'start',
      parts: [{ type: 'text', text: 'Add a piece to Dance Floor' }],
      expectedAssistantCount: 1,
      turns,
    })

    messages = await sendTurn({
      appUrl,
      env,
      cookie: session.cookie,
      supabase,
      conversationId,
      currentMessages: messages,
      turn: 'label_photo',
      parts: [
        {
          type: 'text',
          text: 'Here is the label/details photo for the item.',
        },
        await makeImagePart(assets.paths['ER13229-label.jpg']),
      ],
      expectedAssistantCount: 2,
      turns,
    })

    messages = await sendTurn({
      appUrl,
      env,
      cookie: session.cookie,
      supabase,
      conversationId,
      currentMessages: messages,
      turn: 'jewelry_photo',
      parts: [await makeImagePart(assets.paths['ER13229-jewelry-boxed-front.jpg'])],
      expectedAssistantCount: 3,
      turns,
    })

    let workflow = await getLatestTradeBoardWorkflow(
      supabase,
      rep.id,
      conversationId,
    )
    if (workflow?.missing_fields?.includes('rarityClassification')) {
      messages = await sendTurn({
        appUrl,
        env,
        cookie: session.cookie,
        supabase,
        conversationId,
        currentMessages: messages,
        turn: 'rarity_confirmation',
        parts: [
          {
            type: 'text',
            text: 'No — this is a standard piece, not a diamond or unicorn.',
          },
        ],
        expectedAssistantCount: 4,
        turns,
      })
      workflow = await getLatestTradeBoardWorkflow(
        supabase,
        rep.id,
        conversationId,
      )
    }
    if (workflow?.status !== 'completed') {
      messages = await sendTurn({
        appUrl,
        env,
        cookie: session.cookie,
        supabase,
        conversationId,
        currentMessages: messages,
        turn: 'collection_confirmation',
        parts: [
          {
            type: 'text',
            text: 'Add a second physical pair of ER13229 to my Dance Floor.',
          },
        ],
        expectedAssistantCount: turns.length + 1,
        turns,
      })
      workflow = await getLatestTradeBoardWorkflow(
        supabase,
        rep.id,
        conversationId,
      )
    }

    const hardFails = findHardFailPhrases(extractAssistantText(messages))
    if (hardFails.length > 0) {
      return {
        ok: false,
        status: 'hard_fail_phrase',
        appUrl,
        fixtureDir,
        conversationId,
        rep,
        turns,
        workflow,
        message: `Assistant used hard-fail phrase(s): ${hardFails.join(', ')}`,
      }
    }

    const observedTools = getObservedToolNames(messages)
    for (const requiredTool of REQUIRED_OBSERVED_TOOLS) {
      if (!observedTools.has(requiredTool)) {
        return {
          ok: false,
          status: 'tool_not_observed',
          appUrl,
          fixtureDir,
          conversationId,
          rep,
          turns,
          workflow,
          message: `Did not observe ${requiredTool} output in completed assistant history.`,
        }
      }
    }

    if (workflow?.status !== 'completed') {
      return {
        ok: false,
        status: 'workflow_not_completed',
        appUrl,
        fixtureDir,
        conversationId,
        rep,
        turns,
        workflow,
        message:
          'Dance Floor intake workflow did not complete after the ER13229 replay.',
      }
    }

    const listingIds = workflow.created_listing_ids ?? []
    const listingVerification = await verifyCreatedListing(
      supabase,
      rep.id,
      listingIds,
    )
    if (!listingVerification.ok) {
      return {
        ok: false,
        status: 'listing_not_verified',
        appUrl,
        fixtureDir,
        conversationId,
        rep,
        turns,
        workflow,
        listingIds,
        message: listingVerification.message,
      }
    }

    const cleanup = await cleanupSmokeListings({
      supabase,
      listingIds,
      skip: env.SPARKLE_NIC_NAC_SMOKE_KEEP_LISTING === 'true',
    })

    return {
      ok: true,
      status: 'passed',
      appUrl,
      fixtureDir,
      conversationId,
      rep,
      turns,
      workflow,
      listingIds,
      cleanup,
      message:
        'ER13229 Dance Floor intake smoke passed through the real Nic-Nac API and verified the listing workflow.',
    }
  } catch (error) {
    return {
      ok: false,
      status: 'api_failed',
      appUrl,
      fixtureDir,
      conversationId,
      rep,
      turns,
      message: error instanceof Error ? error.message : String(error),
    }
  }
}

function getMissingLiveSmokeEnv(env: Env): string[] {
  return [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ].filter((name) => !env[name]?.trim())
}

function getSmokeAppUrl(env: Env): string {
  return (
    env.SPARKLE_NIC_NAC_SMOKE_APP_URL?.trim() ||
    DEFAULT_APP_URL
  ).replace(/\/+$/, '')
}

async function prepareSmokeAccount(
  env: Env,
  supabase: SupabaseClient,
): Promise<SmokeAccount> {
  const demoEmail = env.DEMO_REP_EMAIL?.trim()
  if (demoEmail) {
    return {
      email: demoEmail,
      password: env.DEMO_REP_PASSWORD?.trim() || DEFAULT_DEMO_PASSWORD,
      source: 'demo_env',
    }
  }

  const persona = getReviewerSmokePersona(env as NodeJS.ProcessEnv)
  await resetReviewerSmokeSession(
    'dashboard_unlocked',
    supabase as Parameters<typeof resetReviewerSmokeSession>[1],
  )

  return {
    email: persona.email,
    password: persona.password,
    source: 'reviewer_smoke',
  }
}

async function createDemoSessionCookie(
  env: Env,
  account: SmokeAccount,
): Promise<DemoSessionCookie> {
  const email = account.email
  const password = account.password
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  if (!supabaseUrl || !anonKey) {
    throw new Error('Demo Supabase auth environment is incomplete.')
  }

  const client = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) {
    throw new Error(`Nic-Nac smoke demo sign-in failed: ${error.message}`)
  }

  const {
    data: { session },
  } = await client.auth.getSession()
  if (!session) throw new Error('Nic-Nac smoke did not create a Supabase session.')

  const supabaseRef = new URL(supabaseUrl).hostname.split('.')[0]
  return {
    cookie: `sb-${supabaseRef}-auth-token=${encodeURIComponent(
      JSON.stringify(session),
    )}`,
    email,
  }
}

async function fetchNicNacMe(
  appUrl: string,
  env: Env,
  cookie: string,
): Promise<{ id: string; email: string; displayName?: string }> {
  const response = await fetch(
    withVercelProtectionBypass(`${appUrl}/api/nic-nac/me`, env),
    { headers: { cookie } },
  )
  if (!response.ok) {
    throw new Error(
      `/api/nic-nac/me returned ${response.status}: ${await safeResponseSnippet(
        response,
      )}`,
    )
  }
  const payload = (await response.json()) as {
    rep?: { id?: string; email?: string; display_name?: string }
  }
  if (!payload.rep?.id || !payload.rep.email) {
    throw new Error('/api/nic-nac/me did not return a usable rep.')
  }
  return {
    id: payload.rep.id,
    email: payload.rep.email,
    displayName: payload.rep.display_name,
  }
}

async function makeImagePart(assetPath: string): Promise<UiPart> {
  const bytes = await readFile(assetPath)
  return {
    type: 'file',
    mediaType: 'image/jpeg',
    url: `data:image/jpeg;base64,${bytes.toString('base64')}`,
    width: 1800,
    height: 1800,
    blurRisk: 0.05,
    lightingRisk: 0.05,
    subjectCoverage: 0.75,
    subjectCentered: true,
  } as UiPart
}

async function sendTurn(input: {
  appUrl: string
  env: Env
  cookie: string
  supabase: SupabaseClient
  conversationId: string
  currentMessages: UIMessage[]
  turn: string
  parts: UiPart[]
  expectedAssistantCount: number
  turns: SmokeTurnResult[]
}): Promise<UIMessage[]> {
  const nextMessages: UIMessage[] = [
    ...input.currentMessages,
    {
      id: `user-${input.turn}-${randomUUID()}`,
      role: 'user',
      parts: input.parts as UIMessage['parts'],
    },
  ]
  const response = await fetch(
    withVercelProtectionBypass(`${input.appUrl}/api/nic-nac`, input.env),
    {
      method: 'POST',
      headers: {
        cookie: input.cookie,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        conversationId: input.conversationId,
        messages: nextMessages,
        mode: 'workspace',
      }),
    },
  )
  const body = await response.text()
  const runId = response.headers.get('x-nic-nac-run-id')
  if (!response.ok) {
    throw new Error(
      `/api/nic-nac ${input.turn} returned ${response.status}: ${body.slice(
        0,
        500,
      )}`,
    )
  }

  const history = await waitForCanonicalHistory({
    supabase: input.supabase,
    conversationId: input.conversationId,
    expectedAssistantCount: input.expectedAssistantCount,
  })
  const assistantText = extractAssistantText(history)
  const hardFails = findHardFailPhrases(assistantText)
  input.turns.push({
    turn: input.turn,
    runId,
    assistantText: assistantText.slice(-1200),
  })
  if (hardFails.length > 0) {
    throw new Error(
      `${input.turn} produced hard-fail phrase(s): ${hardFails.join(', ')}`,
    )
  }
  return history
}

async function waitForCanonicalHistory(input: {
  supabase: SupabaseClient
  conversationId: string
  expectedAssistantCount: number
}): Promise<UIMessage[]> {
  const startedAt = Date.now()
  let latest: UIMessage[] = []
  while (Date.now() - startedAt < MAX_HISTORY_WAIT_MS) {
    latest = await loadCanonicalHistory(input.supabase, input.conversationId)
    const completedAssistantCount = latest.filter(
      (message) => message.role === 'assistant',
    ).length
    if (completedAssistantCount >= input.expectedAssistantCount) return latest
    await sleep(HISTORY_POLL_MS)
  }
  throw new Error(
    `Timed out waiting for assistant turn ${input.expectedAssistantCount}. Last canonical message count=${latest.length}.`,
  )
}

function extractAssistantText(messages: UIMessage[]): string {
  return messages
    .filter((message) => message.role === 'assistant')
    .flatMap((message) => message.parts ?? [])
    .filter((part) => (part as UiPart).type === 'text')
    .map((part) => (part as UiPart).text ?? '')
    .join('\n')
}

function getObservedToolNames(messages: UIMessage[]): Set<string> {
  const observed = new Set<string>()
  for (const message of messages) {
    if (message.role !== 'assistant') continue
    for (const part of message.parts ?? []) {
      const toolPart = part as UiPart
      if (!toolPart.type?.startsWith('tool-')) continue
      if (toolPart.state !== 'output-available') continue
      observed.add(toolPart.type.slice('tool-'.length))
    }
  }
  return observed
}

async function getLatestTradeBoardWorkflow(
  supabase: SupabaseClient,
  repId: string,
  conversationId: string,
): Promise<LatestWorkflowRow | null> {
  const { data, error } = await supabase
    .from('trade_board_intake_sessions')
    .select(
      [
        'id',
        'status',
        'current_phase',
        'created_listing_ids',
        'created_design_id',
        'missing_fields',
        'hard_blockers',
        'soft_warnings',
      ].join(','),
    )
    .eq('rep_id', repId)
    .eq('conversation_id', conversationId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return (data as LatestWorkflowRow | null) ?? null
}

async function verifyCreatedListing(
  supabase: SupabaseClient,
  repId: string,
  listingIds: string[],
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (listingIds.length === 0) {
    return { ok: false, message: 'Workflow completed without listing ids.' }
  }

  const { data: listings, error: listingError } = await supabase
    .from('trade_listings')
    .select('id,status,design_id,listing_photo_url,uses_canonical_photo')
    .eq('rep_id', repId)
    .in('id', listingIds)
  if (listingError) throw listingError

  const listingRows = (listings ?? []) as SmokeListingRow[]
  if (listingRows.length !== listingIds.length) {
    return {
      ok: false,
      message: `Expected ${listingIds.length} listing row(s), found ${listingRows.length}.`,
    }
  }

  const activeListing = listingRows.find((listing) => listing.status === 'available')
  if (!activeListing) {
    return {
      ok: false,
      message: 'Created listing was not available before smoke cleanup.',
    }
  }
  if (!activeListing.listing_photo_url && !activeListing.uses_canonical_photo) {
    return {
      ok: false,
      message: 'Created listing did not have a display photo.',
    }
  }

  const { data: designs, error: designError } = await supabase
    .from('jewelry_designs')
    .select('id,item_number,design_name')
    .in(
      'id',
      listingRows.map((listing) => listing.design_id),
    )
  if (designError) throw designError

  const designRows = (designs ?? []) as SmokeDesignRow[]
  if (
    !designRows.some(
      (design) =>
        design.item_number === 'ER13229' &&
        /florence earrings/i.test(design.design_name),
    )
  ) {
    return {
      ok: false,
      message: 'Created listing was not tied to ER13229 The Florence Earrings.',
    }
  }

  return { ok: true }
}

async function cleanupSmokeListings(input: {
  supabase: SupabaseClient
  listingIds: string[]
  skip: boolean
}): Promise<{
  skipped: boolean
  removedListingIds: string[]
  error?: string
}> {
  if (input.skip || input.listingIds.length === 0) {
    return { skipped: input.skip, removedListingIds: [] }
  }

  const { error } = await input.supabase
    .from('trade_listings')
    .update({
      status: 'removed',
      removal_reason: 'mistake',
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .in('id', input.listingIds)
  if (error) {
    return {
      skipped: false,
      removedListingIds: [],
      error: error.message,
    }
  }

  return {
    skipped: false,
    removedListingIds: input.listingIds,
  }
}

async function cleanupPriorSmokeListingsForItem(input: {
  supabase: SupabaseClient
  repId: string
  itemNumber: string
}): Promise<void> {
  const { data: design, error: designError } = await input.supabase
    .from('jewelry_designs')
    .select('id')
    .eq('item_number', input.itemNumber)
    .maybeSingle<{ id: string }>()
  if (designError) throw designError
  if (!design?.id) return

  const { error } = await input.supabase
    .from('trade_listings')
    .update({
      status: 'removed',
      removal_reason: 'mistake',
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('rep_id', input.repId)
    .eq('design_id', design.id)
    .neq('status', 'removed')
  if (error) throw error
}

function withVercelProtectionBypass(rawUrl: string, env: Env): string {
  const bypass = env.VERCEL_PROTECTION_BYPASS?.trim()
  if (!bypass) return rawUrl

  const url = new URL(rawUrl)
  url.searchParams.set('x-vercel-set-bypass-cookie', 'true')
  url.searchParams.set('x-vercel-protection-bypass', bypass)
  return url.toString()
}

async function safeResponseSnippet(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 500)
  } catch {
    return 'unreadable response body'
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function main() {
  config({ path: '.env.local', quiet: true })
  const result = await runTradeBoardIntakeSmoke()
  console.log(JSON.stringify(result, null, 2))
  if (!result.ok) process.exit(1)
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
