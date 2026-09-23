/**
 * Synthetic live-domain trade request smoke. Never uses a customer account.
 * Set SPARKLE_TRADE_UPLOAD_SMOKE_FILE to a JPEG/PNG sample. The supplied
 * customer photo is suitable but is never copied into this repository.
 */
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

import { getReviewerSmokePersona } from '@/lib/reviewer-smoke/config'
import { resetReviewerSmokeSession } from '@/lib/reviewer-smoke/session'

config({ path: process.env.SPARKLE_TRADE_UPLOAD_SMOKE_ENV_FILE || '.env.local', quiet: true })

const appUrl = (process.env.SPARKLE_TRADE_UPLOAD_SMOKE_APP_URL || 'https://www.yoursparklesuite.com').replace(/\/+$/, '')
const filePath = process.env.SPARKLE_TRADE_UPLOAD_SMOKE_FILE
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!filePath || !supabaseUrl || !anonKey || !serviceKey) {
  throw new Error('Set SPARKLE_TRADE_UPLOAD_SMOKE_FILE and Supabase URL, anon, and service role keys.')
}

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
let image: Buffer
const fileName = basename(filePath)
const contentType = /\.png$/i.test(fileName) ? 'image/png'
  : /\.heic$/i.test(fileName) ? 'image/heic'
  : /\.heif$/i.test(fileName) ? 'image/heif'
  : /\.avif$/i.test(fileName) ? 'image/avif'
  : /\.webp$/i.test(fileName) ? 'image/webp' : 'image/jpeg'
const runTag = randomUUID().slice(0, 8)
const collectionName = `Codex Trade Upload Smoke ${runTag}`
let collectionId: string | undefined
const designIds: string[] = []
const listingIds: string[] = []
const requestIds: string[] = []
const uploadIds: string[] = []
const objectPaths: string[] = []

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

async function checkedJson(response: Response, label: string) {
  const text = await response.text()
  let body: Record<string, unknown>
  try { body = JSON.parse(text) as Record<string, unknown> } catch { throw new Error(`${label}: ${response.status} ${text.slice(0, 400)}`) }
  if (!response.ok) throw new Error(`${label}: ${response.status} ${JSON.stringify(body)}`)
  return body
}

async function post(path: string, body: Record<string, unknown>) {
  return checkedJson(await fetch(`${appUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: appUrl },
    body: JSON.stringify(body),
  }), path)
}

async function insertSeed(repId: string, suffix: string) {
  const { data: design, error: designError } = await admin.from('jewelry_designs').insert({
    item_number: `ER${runTag}${suffix}`.toUpperCase(),
    design_name: `Synthetic Trade Upload Earrings ${runTag}${suffix}`,
    collection_id: collectionId,
    material: 'Synthetic test material',
    main_stone: 'Synthetic test stone',
    canonical_photo_url: null,
    type_prefix: 'ER',
  }).select('id').single()
  if (designError || !design) throw designError || new Error('design seed missing')
  designIds.push(design.id)
  const { data: listing, error: listingError } = await admin.from('trade_listings').insert({
    rep_id: repId,
    design_id: design.id,
    listing_source: 'catalog',
    status: 'available',
    quantity_available: 1,
    rep_notes: `Synthetic upload smoke ${runTag}`,
    trade_preferences: 'Synthetic reviewer data only.',
    uses_canonical_photo: true,
    listed_at: new Date().toISOString(),
  }).select('id').single()
  if (listingError || !listing) throw listingError || new Error('listing seed missing')
  listingIds.push(listing.id)
  return listing.id as string
}

async function submit(listingId: string, submissionId: string, uploadId?: string) {
  const result = await post('/api/amethyst/trade-requests', {
    listingId,
    submissionId,
    customerName: 'Synthetic Reviewer Customer',
    customerDescription: 'Synthetic OG earrings revealed during the live show.',
    offeredFamily: collectionName,
    offeredType: 'ER',
    manualReviewRequested: false,
    ...(uploadId ? { uploadId } : {}),
  })
  assert(typeof result.requestId === 'string', 'submit did not return requestId')
  assert(typeof result.receiptUrl === 'string', 'submit did not return receiptUrl')
  requestIds.push(result.requestId)
  const page = await fetch(`${appUrl}${result.receiptUrl}`)
  assert(page.ok, `private receipt page returned ${page.status}`)
  const token = result.receiptUrl.split('/').at(-1)
  const receipt = await checkedJson(await fetch(`${appUrl}/api/amethyst/trade-requests/status?token=${token}`), 'receipt status')
  assert(receipt.status === 'pending', 'receipt did not show a pending request')
  return result
}

async function run() {
  image = await readFile(filePath as string)
  if (process.env.SPARKLE_TRADE_UPLOAD_SMOKE_REQUIRE_LARGE === 'true') {
    assert(image.byteLength > 4_500_000, 'Sample must exceed the former 4.5 MB request limit.')
  }
  assert(image.byteLength <= 25 * 1024 * 1024, 'Sample exceeds the advertised 25 MB limit.')
  const reviewer = await resetReviewerSmokeSession('dashboard_unlocked', admin as never)
  assert(reviewer.email === getReviewerSmokePersona().email, 'Reviewer identity mismatch.')
  const { data: collection, error: collectionError } = await admin.from('collections')
    .insert({ name: collectionName }).select('id').single()
  if (collectionError || !collection) throw collectionError || new Error('collection seed missing')
  collectionId = collection.id

  const photoListingId = await insertSeed(reviewer.repId, 'P')
  const textListingId = await insertSeed(reviewer.repId, 'T')
  const reviewHoldMs = Math.min(600_000, Math.max(0, Number(process.env.SPARKLE_TRADE_UPLOAD_SMOKE_REVIEW_HOLD_MS || 0)))
  if (reviewHoldMs > 0) {
    // Reviewer slugs are intentionally reserved and cannot resolve through
    // the published-slug route. The explicitly scoped customer-site path can
    // render this synthetic rep without changing that identity contract.
    console.log(JSON.stringify({ reviewUrl: `${appUrl}/customer-site/trade?c=${reviewer.repId}`,
      photoListingId, textListingId, reviewer: reviewer.email, sampleFile: fileName,
      syntheticOnly: true, cleanupAfterMs: reviewHoldMs }))
    await new Promise((resolve) => setTimeout(resolve, reviewHoldMs))
    return
  }
  const submissionId = randomUUID()
  const ticket = await post('/api/amethyst/trade-requests/uploads', {
    listingId: photoListingId, submissionId, contentType, byteSize: image.byteLength,
  })
  assert(typeof ticket.uploadId === 'string' && typeof ticket.uploadUrl === 'string', 'signed upload ticket missing')
  uploadIds.push(ticket.uploadId)
  // Match Supabase storage-js uploadToSignedUrl exactly. The file bytes never
  // enter a Vercel function request body.
  const form = new FormData()
  form.append('cacheControl', '3600')
  form.append('', new Blob([Uint8Array.from(image)], { type: contentType }))
  const put = await fetch(ticket.uploadUrl, { method: 'PUT', headers: { 'x-upsert': 'false' }, body: form })
  assert(put.ok, `signed storage upload failed: ${put.status} ${(await put.text()).slice(0, 400)}`)
  const confirmed = await post('/api/amethyst/trade-requests/uploads/confirm', {
    uploadId: ticket.uploadId, listingId: photoListingId, submissionId,
  })
  assert(confirmed.ready === true, 'upload confirmation did not report ready')
  const sentPhoto = await submit(photoListingId, submissionId, ticket.uploadId)
  const repeated = await submit(photoListingId, submissionId, ticket.uploadId)
  assert(repeated.requestId === sentPhoto.requestId && repeated.mutationReplayed === true,
    'same submission did not replay its original receipt')

  const { data: photoRow, error: photoError } = await admin.from('trade_requests')
    .select('id,listing_id,reveal_screenshot_path,reveal_screenshot_content_type,reveal_screenshot_size_bytes,reveal_screenshot_expires_at')
    .eq('id', sentPhoto.requestId).single()
  if (photoError) throw photoError
  assert(photoRow?.reveal_screenshot_path && photoRow.reveal_screenshot_content_type === 'image/jpeg',
    'photo was not privately attached as a normalized JPEG')
  assert(Number(photoRow.reveal_screenshot_size_bytes) > 0, 'attached photo size missing')
  const days = (new Date(photoRow.reveal_screenshot_expires_at).getTime() - Date.now()) / 86400_000
  assert(days > 6.9 && days <= 7.1, 'attachment retention is not seven days')
  objectPaths.push(photoRow.reveal_screenshot_path as string)

  const anonymous = await fetch(`${appUrl}/api/nic-nac/trade-requests/${sentPhoto.requestId}/reveal-screenshot`, { redirect: 'manual' })
  assert(anonymous.status === 401, `anonymous image access returned ${anonymous.status}`)
  const auth = createClient(supabaseUrl as string, anonKey as string, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: signIn, error: authError } = await auth.auth.signInWithPassword({
    email: reviewer.email, password: reviewer.password,
  })
  if (authError || !signIn.session) throw authError || new Error('reviewer sign-in missing')
  const ref = new URL(supabaseUrl as string).hostname.split('.')[0]
  const cookie = `sb-${ref}-auth-token=${encodeURIComponent(JSON.stringify(signIn.session))}`
  const repImage = await fetch(`${appUrl}/api/nic-nac/trade-requests/${sentPhoto.requestId}/reveal-screenshot`, {
    headers: { cookie }, redirect: 'manual',
  })
  assert(repImage.status === 307, `reviewer image access returned ${repImage.status}`)

  const sentText = await submit(textListingId, randomUUID())
  const { data: textRow, error: textError } = await admin.from('trade_requests')
    .select('reveal_screenshot_path').eq('id', sentText.requestId).single()
  if (textError) throw textError
  assert(textRow?.reveal_screenshot_path === null, 'text-only request unexpectedly has an image')
  for (const listingId of [photoListingId, textListingId]) {
    const { data, error } = await admin.from('trade_listings').select('status').eq('id', listingId).single()
    if (error) throw error
    assert(data.status === 'pending_trade', `listing ${listingId} was not reserved`)
  }
  console.log(JSON.stringify({ ok: true, appUrl, reviewer: reviewer.email, uploadedBytes: image.byteLength,
    imageType: contentType, imageRequestId: sentPhoto.requestId, textRequestId: sentText.requestId,
    replayed: true, anonymousImageDenied: true, repImageRedirect: true, expiresInDays: Number(days.toFixed(2)) }))
}

async function cleanup() {
  if (listingIds.length) {
    const existing = await admin.from('trade_requests')
      .select('id,reveal_screenshot_path').in('listing_id', listingIds)
    if (existing.error) throw existing.error
    requestIds.push(...(existing.data || []).map((row) => row.id))
    objectPaths.push(...(existing.data || []).map((row) => row.reveal_screenshot_path).filter(Boolean))
  }
  if (requestIds.length) {
    const ids = [...new Set(requestIds)]
    for (const table of ['trade_swaps', 'trade_fulfillment']) {
      const { error } = await admin.from(table).delete().in('request_id', ids)
      if (error) throw error
    }
    const deleted = await admin.from('trade_requests').delete().in('id', ids)
    if (deleted.error) throw deleted.error
  }
  if (listingIds.length) {
    const { data, error } = await admin.from('trade_request_upload_tickets')
      .select('id,raw_path,ready_path').in('listing_id', listingIds)
    if (error) throw error
    objectPaths.push(...(data || []).flatMap(row => [row.raw_path, row.ready_path].filter(Boolean)))
    const ticketIds = [...new Set([...uploadIds, ...(data || []).map(row => row.id)])]
    const deleted = await admin.from('trade_request_upload_tickets').delete().in('id', ticketIds)
    if (deleted.error) throw deleted.error
  }
  if (objectPaths.length) {
    const removed = await admin.storage.from('trade-request-screenshots').remove([...new Set(objectPaths)])
    if (removed.error) throw removed.error
  }
  if (listingIds.length) {
    const deleted = await admin.from('trade_listings').delete().in('id', listingIds)
    if (deleted.error) throw deleted.error
  }
  if (designIds.length) {
    const deleted = await admin.from('jewelry_designs').delete().in('id', designIds)
    if (deleted.error) throw deleted.error
  }
  if (collectionId) {
    const deleted = await admin.from('collections').delete().eq('id', collectionId)
    if (deleted.error) throw deleted.error
  }
}

run().finally(cleanup).catch((error) => {
  console.error(error)
  process.exitCode = 1
})
