import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import type { UIMessage } from 'ai'

import {
  HARD_FAIL_PHRASES,
  findHardFailPhrases,
} from '@/scripts/smoke-nic-nac-trade-board-intake'
import { loadCanonicalHistory } from '@/lib/nic-nac/persistence'
import { getReviewerSmokePersona } from '@/lib/reviewer-smoke/config'
import { resetReviewerSmokeSession } from '@/lib/reviewer-smoke/session'
import { DEFAULT_DEMO_PASSWORD } from '@/scripts/seed-demo-rep'

config({ path: '.env.local' })

const DEFAULT_FIXTURE_DIR = 'C:\\Users\\louis\\sparkle-suite-smoke-assets'
const DEFAULT_APP_URL = 'https://www.yoursparklesuite.com'
const DEFAULT_PHOTO_ASSET = 'ER13229-jewelry-boxed-front.jpg'
const HISTORY_WAIT_MS = 60_000
const HISTORY_POLL_MS = 1_000

const FORBIDDEN_PUBLIC_SOURCE_LANGUAGE = [
  'legacy',
  'miscellaneous',
  'grab bag',
  'unknown',
  'undocumented',
  'Board Pieces',
  'non-item number',
  'piece without item number',
] as const

type Env = Record<string, string | undefined>
type UiPart = UIMessage['parts'][number] & {
  type?: string
  text?: string
  mediaType?: string
  url?: string
  state?: string
  output?: unknown
}

interface SmokeListingRow {
  id: string
  rep_id: string
  design_id: string | null
  status: string
  listing_source: string | null
  manual_type_prefix: string | null
  manual_collection_family: string | null
  manual_collection_name: string | null
  manual_size: string | null
  listing_photo_url: string | null
}

interface WorkflowRow {
  id: string
  status: string
  current_phase: string
  created_listing_ids: string[] | null
  created_design_id: string | null
}

interface SmokeTurnResult {
  turn: string
  runId: string | null
  assistantText: string
}

export interface NonItemNumberTradeBoardSmokeResult {
  ok: boolean
  status:
    | 'passed'
    | 'missing_assets'
    | 'missing_env'
    | 'api_failed'
    | 'hard_fail_phrase'
    | 'workflow_not_completed'
    | 'listing_not_verified'
    | 'public_payload_leak'
  appUrl?: string
  fixturePath?: string
  missing?: string[]
  conversationId?: string
  rep?: { id: string; email: string; displayName?: string }
  turns?: SmokeTurnResult[]
  workflow?: WorkflowRow | null
  listing?: SmokeListingRow | null
  cleanup?: { skipped: boolean; removedListingIds: string[]; error?: string }
  message: string
}

export function requireNonItemNumberSmokeAsset(
  env: Env = process.env,
  fsLike: Pick<typeof fs, 'existsSync'> = fs,
) {
  const explicitPath = env.SPARKLE_NIC_NAC_NON_ITEM_SMOKE_PHOTO?.trim()
  const fixturePath =
    explicitPath ||
    path.join(
      env.SPARKLE_NIC_NAC_SMOKE_ASSETS?.trim() || DEFAULT_FIXTURE_DIR,
      DEFAULT_PHOTO_ASSET,
    )

  if (!fsLike.existsSync(fixturePath)) {
    return {
      ok: false as const,
      fixturePath,
      missing: [fixturePath],
    }
  }

  return {
    ok: true as const,
    fixturePath,
  }
}

export function findForbiddenPublicSourceLanguage(text: string): string[] {
  const normalized = text.toLocaleLowerCase()
  return FORBIDDEN_PUBLIC_SOURCE_LANGUAGE.filter((phrase) =>
    normalized.includes(phrase.toLocaleLowerCase()),
  )
}

export function publicTradeBoardPayloadHasListing(
  payload: unknown,
  listingId: string,
): boolean {
  if (!payload || typeof payload !== 'object') return false
  const listings = (payload as { listings?: unknown }).listings
  if (!Array.isArray(listings)) return false
  return listings.some((listing) => {
    if (!listing || typeof listing !== 'object') return false
    return (listing as { id?: unknown }).id === listingId
  })
}

export async function runNonItemNumberTradeBoardSmoke(
  env: Env = process.env,
): Promise<NonItemNumberTradeBoardSmokeResult> {
  const asset = requireNonItemNumberSmokeAsset(env)
  if (!asset.ok) {
    return {
      ok: false,
      status: 'missing_assets',
      fixturePath: asset.fixturePath,
      missing: asset.missing,
      message:
        'Non-item-number Dance Floor smoke needs one individual jewelry photo fixture.',
    }
  }

  const missingEnv = getMissingEnv(env)
  if (missingEnv.length > 0) {
    return {
      ok: false,
      status: 'missing_env',
      fixturePath: asset.fixturePath,
      missing: missingEnv,
      message: 'Non-item-number Dance Floor smoke is missing required environment.',
    }
  }

  const appUrl = getSmokeAppUrl(env)
  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
  const smokeAccount = await prepareSmokeAccount(env, supabase)
  const sessionCookie = await createSessionCookie(env, smokeAccount)
  const rep = await fetchNicNacMe(appUrl, env, sessionCookie)
  const conversationId = randomUUID()
  const turns: SmokeTurnResult[] = []
  let messages: UIMessage[] = []
  let workflow: WorkflowRow | null = null
  let listing: SmokeListingRow | null = null
  let createdListingIds: string[] = []

  try {
    messages = await sendTurn({
      appUrl,
      env,
      cookie: sessionCookie,
      supabase,
      conversationId,
      currentMessages: messages,
      turn: 'start',
      parts: [
        {
          type: 'text',
          text: 'Add a piece to my Dance Floor. I do not have an item number for this one.',
        },
      ],
      turns,
    })

    messages = await sendTurn({
      appUrl,
      env,
      cookie: sessionCookie,
      supabase,
      conversationId,
      currentMessages: messages,
      turn: 'photo_and_details',
      parts: [
        {
          type: 'text',
          text:
            'Use this as the customer-facing photo. It is earrings from the Birthday collection, exact collection July Birthday 2026. Please add it as a non-item number piece.',
        },
        await makeImagePart(asset.fixturePath),
      ],
      turns,
    })

    workflow = await getLatestWorkflow(supabase, rep.id, conversationId)
    if (workflow?.status !== 'completed') {
      messages = await sendTurn({
        appUrl,
        env,
        cookie: sessionCookie,
        supabase,
        conversationId,
        currentMessages: messages,
        turn: 'confirm',
        parts: [
          {
            type: 'text',
            text:
              'Yes, that is correct. Jewelry type earrings, broad collection Birthday, exact collection July Birthday 2026. Add it now.',
          },
        ],
        turns,
      })
      workflow = await getLatestWorkflow(supabase, rep.id, conversationId)
    }
    createdListingIds = workflow?.created_listing_ids ?? []

    const hardFails = findHardFailPhrases(extractAssistantText(messages))
    if (hardFails.length > 0) {
      const cleanup = await cleanupListings({
        supabase,
        listingIds: createdListingIds,
        skip: env.SPARKLE_NIC_NAC_SMOKE_KEEP_LISTING === 'true',
      })
      return {
        ok: false,
        status: 'hard_fail_phrase',
        appUrl,
        fixturePath: asset.fixturePath,
        conversationId,
        rep,
        turns,
        workflow,
        cleanup,
        message: `Assistant used hard-fail phrase(s): ${hardFails.join(', ')}`,
      }
    }

    if (workflow?.status !== 'completed') {
      const cleanup = await cleanupListings({
        supabase,
        listingIds: createdListingIds,
        skip: env.SPARKLE_NIC_NAC_SMOKE_KEEP_LISTING === 'true',
      })
      return {
        ok: false,
        status: 'workflow_not_completed',
        appUrl,
        fixturePath: asset.fixturePath,
        conversationId,
        rep,
        turns,
        workflow,
        cleanup,
        message:
          'Non-item-number Dance Floor intake workflow did not complete after replay.',
      }
    }

    const listingId = workflow.created_listing_ids?.[0]
    listing = listingId
      ? await getListing(supabase, rep.id, listingId)
      : null
    if (!listing || !isExpectedNonItemNumberListing(listing)) {
      const cleanup = await cleanupListings({
        supabase,
        listingIds: createdListingIds,
        skip: env.SPARKLE_NIC_NAC_SMOKE_KEEP_LISTING === 'true',
      })
      return {
        ok: false,
        status: 'listing_not_verified',
        appUrl,
        fixturePath: asset.fixturePath,
        conversationId,
        rep,
        turns,
        workflow,
        listing,
        cleanup,
        message:
          'Created listing was not verified as a non-item-number Dance Floor row.',
      }
    }

    if (!(await finderAvailabilityExcludesListing(supabase, listing.id))) {
      const cleanup = await cleanupListings({
        supabase,
        listingIds: createdListingIds,
        skip: env.SPARKLE_NIC_NAC_SMOKE_KEEP_LISTING === 'true',
      })
      return {
        ok: false,
        status: 'listing_not_verified',
        appUrl,
        fixturePath: asset.fixturePath,
        conversationId,
        rep,
        turns,
        workflow,
        listing,
        cleanup,
        message:
          'Non-item-number listing was still visible to the Finder catalog filter.',
      }
    }

    const publicPayload = await fetchPublicTradeBoardPayload(appUrl, env, rep.id)
    if (!publicTradeBoardPayloadHasListing(publicPayload, listing.id)) {
      const cleanup = await cleanupListings({
        supabase,
        listingIds: createdListingIds,
        skip: env.SPARKLE_NIC_NAC_SMOKE_KEEP_LISTING === 'true',
      })
      return {
        ok: false,
        status: 'listing_not_verified',
        appUrl,
        fixturePath: asset.fixturePath,
        conversationId,
        rep,
        turns,
        workflow,
        listing,
        cleanup,
        message:
          'Created listing was not present in the public Dance Floor payload.',
      }
    }
    const leaks = findForbiddenPublicSourceLanguage(
      JSON.stringify(publicPayload),
    )
    if (leaks.length > 0) {
      const cleanup = await cleanupListings({
        supabase,
        listingIds: createdListingIds,
        skip: env.SPARKLE_NIC_NAC_SMOKE_KEEP_LISTING === 'true',
      })
      return {
        ok: false,
        status: 'public_payload_leak',
        appUrl,
        fixturePath: asset.fixturePath,
        conversationId,
        rep,
        turns,
        workflow,
        listing,
        cleanup,
        message: `Public Dance Floor payload leaked source language: ${leaks.join(', ')}`,
      }
    }

    const cleanup = await cleanupListings({
      supabase,
      listingIds: [listing.id],
      skip: env.SPARKLE_NIC_NAC_SMOKE_KEEP_LISTING === 'true',
    })

    return {
      ok: true,
      status: 'passed',
      appUrl,
      fixturePath: asset.fixturePath,
      conversationId,
      rep,
      turns,
      workflow,
      listing,
      cleanup,
      message:
        'Non-item-number Dance Floor smoke passed through Nic-Nac, verified the listing row, checked the public payload, and cleaned up.',
    }
  } catch (error) {
    if (createdListingIds.length === 0) {
      try {
        workflow = await getLatestWorkflow(supabase, rep.id, conversationId)
        createdListingIds = workflow?.created_listing_ids ?? []
      } catch {
        createdListingIds = []
      }
    }
    const cleanup = await cleanupListings({
      supabase,
      listingIds: createdListingIds,
      skip: env.SPARKLE_NIC_NAC_SMOKE_KEEP_LISTING === 'true',
    })
    return {
      ok: false,
      status: 'api_failed',
      appUrl,
      fixturePath: asset.fixturePath,
      conversationId,
      rep,
      turns,
      workflow,
      listing,
      cleanup,
      message: error instanceof Error ? error.message : String(error),
    }
  }
}

function getMissingEnv(env: Env) {
  return [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ].filter((name) => !env[name]?.trim())
}

function getSmokeAppUrl(env: Env) {
  return (
    env.SPARKLE_NIC_NAC_SMOKE_APP_URL?.trim() || DEFAULT_APP_URL
  ).replace(/\/+$/, '')
}

async function prepareSmokeAccount(env: Env, supabase: SupabaseClient) {
  const demoEmail = env.DEMO_REP_EMAIL?.trim()
  if (demoEmail) {
    return {
      email: demoEmail,
      password: env.DEMO_REP_PASSWORD?.trim() || DEFAULT_DEMO_PASSWORD,
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
  }
}

async function createSessionCookie(
  env: Env,
  account: { email: string; password: string },
) {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase auth environment is incomplete.')
  }

  const client = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error } = await client.auth.signInWithPassword(account)
  if (error) throw new Error(`Smoke sign-in failed: ${error.message}`)

  const {
    data: { session },
  } = await client.auth.getSession()
  if (!session) throw new Error('Smoke sign-in did not create a session.')

  const supabaseRef = new URL(supabaseUrl).hostname.split('.')[0]
  return `sb-${supabaseRef}-auth-token=${encodeURIComponent(
    JSON.stringify(session),
  )}`
}

async function fetchNicNacMe(appUrl: string, env: Env, cookie: string) {
  const response = await fetch(
    withVercelProtectionBypass(`${appUrl}/api/nic-nac/me`, env),
    { headers: { cookie } },
  )
  if (!response.ok) {
    throw new Error(`/api/nic-nac/me returned ${response.status}`)
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
      `/api/nic-nac ${input.turn} returned ${response.status}: ${body.slice(0, 500)}`,
    )
  }

  const messages = await waitForCanonicalMessages({
    supabase: input.supabase,
    conversationId: input.conversationId,
    fallbackMessages: nextMessages,
  })
  input.turns.push({
    turn: input.turn,
    runId,
    assistantText: extractAssistantText(messages),
  })
  return messages
}

async function waitForCanonicalMessages(input: {
  supabase: SupabaseClient
  conversationId: string
  fallbackMessages: UIMessage[]
}) {
  const deadline = Date.now() + HISTORY_WAIT_MS
  while (Date.now() < deadline) {
    const latest = await loadCanonicalHistory(input.supabase, input.conversationId)
    if (latest.some((message) => message.role === 'assistant')) {
      return latest
    }
    await new Promise((resolve) => setTimeout(resolve, HISTORY_POLL_MS))
  }
  return input.fallbackMessages
}

async function getLatestWorkflow(
  supabase: SupabaseClient,
  repId: string,
  conversationId: string,
) {
  const { data, error } = await supabase
    .from('trade_board_intake_sessions')
    .select('id,status,current_phase,created_listing_ids,created_design_id')
    .eq('rep_id', repId)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return (data ?? null) as WorkflowRow | null
}

async function getListing(
  supabase: SupabaseClient,
  repId: string,
  listingId: string,
) {
  const { data, error } = await supabase
    .from('trade_listings')
    .select(
      'id,rep_id,design_id,status,listing_source,manual_type_prefix,manual_collection_family,manual_collection_name,manual_size,listing_photo_url',
    )
    .eq('id', listingId)
    .eq('rep_id', repId)
    .maybeSingle()
  if (error) throw error
  return (data ?? null) as SmokeListingRow | null
}

function isExpectedNonItemNumberListing(listing: SmokeListingRow) {
  return (
    listing.listing_source === 'non_item_number' &&
    listing.design_id === null &&
    listing.manual_type_prefix === 'ER' &&
    listing.manual_collection_family === 'Birthday' &&
    listing.manual_collection_name === 'July Birthday 2026' &&
    listing.manual_size === null &&
    Boolean(listing.listing_photo_url)
  )
}

export async function finderAvailabilityExcludesListing(
  supabase: SupabaseClient,
  listingId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('trade_listings')
    .select('id')
    .eq('id', listingId)
    .eq('listing_source', 'catalog')
    .not('design_id', 'is', null)
    .maybeSingle()
  if (error) throw error
  return data == null
}

async function fetchPublicTradeBoardPayload(
  appUrl: string,
  env: Env,
  repId: string,
) {
  const response = await fetch(
    withVercelProtectionBypass(
      `${appUrl}/api/amethyst/trade-board?c=${encodeURIComponent(repId)}`,
      env,
    ),
  )
  if (!response.ok) {
    throw new Error(`/api/amethyst/trade-board returned ${response.status}`)
  }
  return response.json()
}

async function cleanupListings(input: {
  supabase: SupabaseClient
  listingIds: string[]
  skip: boolean
}) {
  if (input.skip) {
    return { skipped: true, removedListingIds: [] }
  }
  const removedListingIds: string[] = []
  try {
    for (const listingId of input.listingIds) {
      const { error } = await input.supabase
        .from('trade_listings')
        .delete()
        .eq('id', listingId)
        .eq('listing_source', 'non_item_number')
      if (error) throw error
      removedListingIds.push(listingId)
    }
    return { skipped: false, removedListingIds }
  } catch (error) {
    return {
      skipped: false,
      removedListingIds,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

function extractAssistantText(messages: UIMessage[]) {
  return messages
    .filter((message) => message.role === 'assistant')
    .flatMap((message) => message.parts ?? [])
    .map((part) => {
      const p = part as UiPart
      if (typeof p.text === 'string') return p.text
      if (p.output && typeof p.output === 'object') {
        return JSON.stringify(p.output)
      }
      return ''
    })
    .filter(Boolean)
    .join('\n')
}

function withVercelProtectionBypass(url: string, env: Env) {
  const secret = env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim()
  if (!secret) return url
  const parsed = new URL(url)
  parsed.searchParams.set('x-vercel-protection-bypass', secret)
  parsed.searchParams.set('x-vercel-set-bypass-cookie', 'true')
  return parsed.toString()
}

function printResult(result: NonItemNumberTradeBoardSmokeResult) {
  const line = `[non-item-smoke] status=${result.status} ok=${result.ok} message=${result.message}`
  if (result.ok) {
    console.log(line)
    console.log(
      JSON.stringify(
        {
          appUrl: result.appUrl,
          conversationId: result.conversationId,
          rep: result.rep,
          workflow: result.workflow,
          listing: result.listing,
          cleanup: result.cleanup,
          hardFailPhrases: HARD_FAIL_PHRASES,
        },
        null,
        2,
      ),
    )
  } else {
    console.error(line)
    console.error(JSON.stringify(result, null, 2))
  }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/smoke-nic-nac-trade-board-non-item-number.ts')) {
  runNonItemNumberTradeBoardSmoke()
    .then((result) => {
      printResult(result)
      process.exitCode = result.ok ? 0 : 1
    })
    .catch((error) => {
      console.error('[non-item-smoke] error', error)
      process.exitCode = 1
    })
}
