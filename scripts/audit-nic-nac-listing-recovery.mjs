import { config as loadEnv } from 'dotenv'
import { createHash, randomUUID } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

loadEnv({ path: '.env.local', quiet: true })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Supabase production credentials are required.')

const supabase = createClient(url, key, { auth: { persistSession: false } })
const batchId = process.env.NIC_NAC_REPAIR_BATCH_ID || randomUUID()

async function digest(source) {
  if (!source) return null
  try {
    const match = /^data:[^;]+;base64,(.+)$/i.exec(source)
    const bytes = match
      ? Buffer.from(match[1], 'base64')
      : Buffer.from(await (await fetch(source)).arrayBuffer())
    return { sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length }
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  }
}

const { data: listings, error: listingError } = await supabase
  .from('trade_listings')
  .select('id,rep_id,design_id,status,listing_photo_url,uses_canonical_photo,listed_at,rep_notes,trade_preferences,design:jewelry_designs(id,item_number,design_name,main_stone,canonical_photo_url,photo_pipeline_status,photo_pipeline_original_url,created_at)')
  .in('status', ['available', 'pending_trade'])
if (listingError) throw listingError

const { data: sessions, error: sessionError } = await supabase
  .from('trade_board_intake_sessions')
  .select('id,rep_id,conversation_id,created_listing_ids,created_design_id,created_at,trade_board_intake_photos(id,conversation_message_id,attachment_index,declared_role,visual_role,role_confirmed,image_url,quality,created_at)')
  .order('created_at', { ascending: true })
if (sessionError) throw sessionError

const sessionByListing = new Map()
for (const session of sessions ?? []) {
  for (const listingId of session.created_listing_ids ?? []) sessionByListing.set(listingId, session)
}

const rows = []
for (const listing of listings ?? []) {
  const design = Array.isArray(listing.design) ? listing.design[0] : listing.design
  const publicPhotoUrl = listing.listing_photo_url ||
    (listing.uses_canonical_photo ? design?.canonical_photo_url : null)
  const current = await digest(publicPhotoUrl)
  const session = sessionByListing.get(listing.id) ||
    (sessions ?? []).find((candidate) => candidate.created_design_id === listing.design_id)
  const candidates = []
  for (const photo of session?.trade_board_intake_photos ?? []) {
    if (photo.declared_role !== 'jewelry_front' || !photo.image_url) continue
    candidates.push({
      photoId: photo.id,
      messageId: photo.conversation_message_id,
      attachmentIndex: photo.attachment_index,
      declaredRole: photo.declared_role,
      visualRole: photo.visual_role,
      roleConfirmed: photo.role_confirmed,
      quality: photo.quality,
      ...(await digest(photo.image_url)),
    })
  }
  rows.push({
    listingId: listing.id,
    designId: listing.design_id,
    repId: listing.rep_id,
    itemNumber: design?.item_number ?? null,
    designName: design?.design_name ?? null,
    listedAt: listing.listed_at,
    pipelineStatus: design?.photo_pipeline_status ?? null,
    usesCanonicalPhoto: listing.uses_canonical_photo,
    currentPhotoSha256: current?.sha256 ?? null,
    currentPhotoBytes: current?.bytes ?? null,
    currentPhotoError: current?.error ?? null,
    inferredRarityWords: /\bunicorn\b/i.test([design?.design_name, design?.main_stone, listing.rep_notes, listing.trade_preferences].filter(Boolean).join(' '))
      ? ['unicorn']
      : /\bdiamond\b/i.test([design?.design_name, design?.main_stone, listing.rep_notes, listing.trade_preferences].filter(Boolean).join(' '))
        ? ['diamond'] : [],
    sourceConversationId: session?.conversation_id ?? null,
    candidates,
    recommendedCandidatePhotoId:
      candidates.length === 1 && candidates[0].sha256 !== current?.sha256
        ? candidates[0].photoId
        : null,
  })
}

const hashGroups = new Map()
for (const row of rows) {
  if (!row.currentPhotoSha256) continue
  const group = hashGroups.get(row.currentPhotoSha256) ?? []
  group.push({ listingId: row.listingId, itemNumber: row.itemNumber })
  hashGroups.set(row.currentPhotoSha256, group)
}

const report = {
  generatedAt: new Date().toISOString(),
  repairBatchId: batchId,
  mode: 'read_only',
  summary: {
    activeListings: rows.length,
    photoErrors: rows.filter((row) => row.pipelineStatus === 'error').length,
    inferredDiamondOrUnicornWords: rows.filter((row) => row.inferredRarityWords.length).length,
    duplicateCurrentPhotoGroups: [...hashGroups.values()].filter((group) => group.length > 1).length,
    listingsWithRecoverableCandidate: rows.filter((row) => row.recommendedCandidatePhotoId).length,
  },
  duplicateCurrentPhotoGroups: [...hashGroups.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([sha256, group]) => ({ sha256, listings: group })),
  rows,
}

const outputRows = process.env.NIC_NAC_AUDIT_ROW_AFTER
  ? report.rows.filter((row) => Date.parse(row.listedAt ?? '') >= Date.parse(process.env.NIC_NAC_AUDIT_ROW_AFTER))
  : report.rows
const renderedReport = `${JSON.stringify(
  process.env.NIC_NAC_AUDIT_SUMMARY_ONLY === 'true'
    ? { ...report, rows: outputRows.map(({ candidates, ...row }) => ({ ...row, candidateCount: candidates.length })) }
    : { ...report, rows: outputRows },
  null,
  2,
)}\n`
if (process.env.NIC_NAC_AUDIT_OUTPUT_FILE) {
  await writeFile(path.resolve(process.env.NIC_NAC_AUDIT_OUTPUT_FILE), renderedReport)
  process.stdout.write(`${JSON.stringify({
    outputFile: path.resolve(process.env.NIC_NAC_AUDIT_OUTPUT_FILE),
    repairBatchId: batchId,
    summary: report.summary,
  })}\n`)
} else {
  process.stdout.write(renderedReport)
}
