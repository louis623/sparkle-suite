import { config as loadEnv } from 'dotenv'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

import { assessJewelryPhotoPreflight } from '@/lib/services/jewelry-photo-preflight'
import { createGuardedJewelryPhotoCrop } from '@/lib/services/jewelry-photo-crop'
import { classifyJewelryPhotoSemantics } from '@/lib/services/jewelry-photo-semantics'
import { processRepListingPhotoUrl } from '@/lib/services/listing-photo-processing'
import { analyzeServerImageQuality } from '@/lib/services/server-image-quality'

loadEnv({ path: '.env.local', quiet: true })

interface ManifestEntry {
  listingId: string
  designId: string
  itemNumber: string
  designName: string
  decision: 'replace_from_workflow_photo' | 'retain_source_photo'
  currentPhotoSha256: string
  selectedPhotoId: string
  selectedPhotoSha256: string
  visualFinding: string
  rarityClassification: 'standard'
}

interface RepairManifest {
  schemaVersion: number
  batchId: string
  sourceWindow: { repId: string }
  entries: ManifestEntry[]
}

const apply = process.argv.includes('--apply')
const manifestArgument = process.argv.find((argument) => argument.startsWith('--manifest='))
const manifestPath = path.resolve(
  manifestArgument?.slice('--manifest='.length) ||
    'docs/sparkle-suite/audits/2026-09-13-nic-nac-heather-recovery-manifest.json',
)
const reportArgument = process.argv.find((argument) => argument.startsWith('--report='))
const reportPath = path.resolve(
  reportArgument?.slice('--report='.length) ||
    (apply
      ? 'artifacts/nic-nac-recovery-2026-09-13/apply-report.json'
      : 'artifacts/nic-nac-recovery-2026-09-13/dry-run-report.json'),
)
const previewDirectoryArgument = process.argv.find((argument) =>
  argument.startsWith('--preview-directory='),
)

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Supabase production credentials are required.')
const supabaseUrl = url
const serviceRoleKey = key
if (apply && process.env.NIC_NAC_REPAIR_CONFIRM !== 'APPLY_REVIEWED_MANIFEST') {
  throw new Error(
    'Apply mode requires NIC_NAC_REPAIR_CONFIRM=APPLY_REVIEWED_MANIFEST.',
  )
}

function digest(bytes: Uint8Array) {
  return createHash('sha256').update(bytes).digest('hex')
}

async function fetchBytes(source: string): Promise<Uint8Array> {
  const match = /^data:[^;]+;base64,(.+)$/i.exec(source)
  if (match) return new Uint8Array(Buffer.from(match[1], 'base64'))
  const response = await fetch(source)
  if (!response.ok) throw new Error(`Photo download failed with ${response.status}`)
  return new Uint8Array(await response.arrayBuffer())
}

function publicPhotoUrl(listing: {
  listing_photo_url: string | null
  uses_canonical_photo: boolean
  design: { canonical_photo_url: string | null }
}) {
  return listing.listing_photo_url ||
    (listing.uses_canonical_photo ? listing.design.canonical_photo_url : null)
}

async function main() {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as RepairManifest
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.entries) || manifest.entries.length < 1) {
    throw new Error('Repair manifest must be schema version 1 with at least one reviewed entry.')
  }
  const listingIds = manifest.entries.map((entry) => entry.listingId)
  if (new Set(listingIds).size !== listingIds.length) {
    throw new Error('Repair manifest contains duplicate listing IDs.')
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })
  const outcomes = []
  const previewDirectory = path.resolve(
    previewDirectoryArgument?.slice('--preview-directory='.length) ||
      'artifacts/nic-nac-recovery-2026-09-13/proposed-crops',
  )
  await mkdir(path.dirname(reportPath), { recursive: true })
  await mkdir(previewDirectory, { recursive: true })
  for (const entry of manifest.entries) {
  const { data: listingData, error: listingError } = await supabase
    .from('trade_listings')
    .select('id,rep_id,design_id,listing_photo_url,uses_canonical_photo,design:jewelry_designs(id,item_number,design_name,canonical_photo_url,photo_pipeline_status)')
    .eq('id', entry.listingId)
    .single()
  if (listingError) throw listingError
  const design = Array.isArray(listingData.design)
    ? listingData.design[0]
    : listingData.design
  const listing = { ...listingData, design }
  if (
    listing.rep_id !== manifest.sourceWindow.repId ||
    listing.design_id !== entry.designId ||
    design.id !== entry.designId ||
    design.item_number !== entry.itemNumber ||
    design.design_name !== entry.designName
  ) {
    throw new Error(`Identity mismatch for ${entry.listingId} (${entry.itemNumber}).`)
  }

  const { count: activeDesignListingCount, error: designListingCountError } = await supabase
    .from('trade_listings')
    .select('id', { count: 'exact', head: true })
    .eq('design_id', entry.designId)
    .in('status', ['available', 'pending_trade'])
  if (designListingCountError) throw designListingCountError
  if (activeDesignListingCount !== 1) {
    throw new Error(
      `Design ${entry.designId} now has ${activeDesignListingCount ?? 'unknown'} current listings; expected exactly one reviewed target.`,
    )
  }

  const { data: photo, error: photoError } = await supabase
    .from('trade_board_intake_photos')
    .select('id,session_id,rep_id,image_url,declared_role,visual_role,quality,session:trade_board_intake_sessions(rep_id,created_design_id,created_listing_ids)')
    .eq('id', entry.selectedPhotoId)
    .single()
  if (photoError) throw photoError
  const session = Array.isArray(photo.session) ? photo.session[0] : photo.session
  if (
    photo.rep_id !== manifest.sourceWindow.repId ||
    session?.rep_id !== manifest.sourceWindow.repId ||
    (session?.created_design_id !== entry.designId &&
      !(session?.created_listing_ids ?? []).includes(entry.listingId)) ||
    photo.declared_role !== 'jewelry_front' ||
    !photo.image_url
  ) {
    throw new Error(`Workflow source mismatch for ${entry.listingId} (${entry.itemNumber}).`)
  }

  const currentUrl = publicPhotoUrl(listing)
  if (!currentUrl) throw new Error(`Current public photo is missing for ${entry.listingId}.`)
  const [currentBytes, sourceBytes] = await Promise.all([
    fetchBytes(currentUrl),
    fetchBytes(photo.image_url),
  ])
  const currentSha256 = digest(currentBytes)
  const sourceSha256 = digest(sourceBytes)
  if (
    currentSha256 !== entry.currentPhotoSha256 ||
    sourceSha256 !== entry.selectedPhotoSha256
  ) {
    throw new Error(`Photo hash changed after review for ${entry.listingId} (${entry.itemNumber}).`)
  }

  const originalAnalysis = await analyzeServerImageQuality(sourceBytes)
  const originalSemantic = classifyJewelryPhotoSemantics(originalAnalysis)
  const originalPreflight = assessJewelryPhotoPreflight({
    width: originalAnalysis.width,
    height: originalAnalysis.height,
    blurRisk: originalAnalysis.blurRisk,
    lightingRisk: originalAnalysis.lightingRisk,
    detailRisk: originalAnalysis.detailRisk,
    backgroundDistractionRisk: originalAnalysis.backgroundDistractionRisk,
    subjectCoverage: originalAnalysis.subjectCoverage,
    subjectCentered: originalAnalysis.subjectCentered,
  })
  const crop = originalSemantic.canAttemptCrop
    ? await createGuardedJewelryPhotoCrop({
        bytes: sourceBytes,
        analysis: originalAnalysis,
        allowReviewableOutput: true,
      })
    : null
  const preview = crop ?? {
    selectedSource: 'original' as const,
    analysis: originalAnalysis,
    preflight: originalPreflight,
  }

  const outcome: Record<string, unknown> = {
    listingId: entry.listingId,
    designId: entry.designId,
    itemNumber: entry.itemNumber,
    decision: entry.decision,
    sourcePhotoId: entry.selectedPhotoId,
    currentPhotoSha256: currentSha256,
    sourcePhotoSha256: sourceSha256,
    semanticRole: originalSemantic.role,
    semanticReasons: originalSemantic.reasons,
    width: originalAnalysis.width,
    height: originalAnalysis.height,
    detailConfidence: originalAnalysis.detailConfidence,
    blurRisk: originalAnalysis.blurRisk,
    backgroundDistractionRisk: originalAnalysis.backgroundDistractionRisk,
    backgroundUniformity: originalAnalysis.backgroundUniformity,
    backgroundCleanliness: originalAnalysis.backgroundCleanliness,
    selectedSource: preview.selectedSource,
    preflightPassed: preview.preflight.passed,
    preflightScore: preview.preflight.score,
    preflightIssues: preview.preflight.issues,
    subjectCoverageBefore: originalAnalysis.subjectCoverage,
    subjectCoverageAfter: preview.analysis.subjectCoverage,
    subjectCenteredBefore: originalAnalysis.subjectCentered,
    subjectCenteredAfter: preview.analysis.subjectCentered,
    activeDesignListingCount,
    mode: apply ? 'apply' : 'dry_run',
  }
  if (crop) {
    const previewPath = path.join(
      previewDirectory,
      `${entry.itemNumber}-${entry.listingId}.jpg`,
    )
    await writeFile(previewPath, crop.bytes)
    outcome.proposedCropPath = previewPath
  }

  if (apply) {
    const processed = await processRepListingPhotoUrl(
      {
        repId: manifest.sourceWindow.repId,
        sourceImageUrl: photo.image_url,
        filenameStem: `recovery-${entry.itemNumber}`,
        mutationAssetKey: `${manifest.batchId}-${entry.listingId}`,
      },
      { confirmedJewelryFront: true },
    )
    const { data: receipt, error: repairError } = await supabase.rpc(
      'rpc_apply_jewelry_listing_photo_repair',
      {
        p_repair_batch_id: manifest.batchId,
        p_listing_id: entry.listingId,
        p_design_id: entry.designId,
        p_rep_id: manifest.sourceWindow.repId,
        p_expected_listing_photo_url: listing.listing_photo_url,
        p_expected_canonical_photo_url: design.canonical_photo_url,
        p_new_photo_url: processed.photoUrl,
        p_original_photo_url: processed.originalPhotoUrl,
        p_source_photo_id: entry.selectedPhotoId,
        p_source_content_sha256: sourceSha256,
        p_reason: entry.visualFinding,
        p_preflight_score: processed.preflight.score,
        p_preflight_issues: processed.preflight.issues,
        p_selected_source: processed.selectedSource,
      },
    )
    if (repairError) throw repairError

    const { data: readback, error: readbackError } = await supabase
      .from('trade_listings')
      .select('id,listing_photo_url,uses_canonical_photo,rarity_classification,design:jewelry_designs(canonical_photo_url,photo_pipeline_status,rarity_classification)')
      .eq('id', entry.listingId)
      .single()
    if (readbackError) throw readbackError
    const readbackDesign = Array.isArray(readback.design)
      ? readback.design[0]
      : readback.design
    if (
      readback.listing_photo_url !== processed.photoUrl ||
      readback.uses_canonical_photo !== false ||
      readback.rarity_classification !== 'standard' ||
      readbackDesign?.canonical_photo_url !== processed.photoUrl ||
      readbackDesign?.photo_pipeline_status !== 'published' ||
      readbackDesign?.rarity_classification !== 'standard'
    ) {
      throw new Error(`Database readback failed for ${entry.listingId}.`)
    }
    const publishedSha256 = digest(await fetchBytes(processed.photoUrl))
    Object.assign(outcome, {
      receipt,
      publishedPhotoSha256: publishedSha256,
      databaseReadbackVerified: true,
    })
  }
    outcomes.push(outcome)
  }

  const result = {
    generatedAt: new Date().toISOString(),
    batchId: manifest.batchId,
    manifestPath,
    manifestSha256: digest(new TextEncoder().encode(await readFile(manifestPath, 'utf8'))),
    mode: apply ? 'apply' : 'dry_run',
    summary: {
      entries: outcomes.length,
      replace: manifest.entries.filter((entry) => entry.decision === 'replace_from_workflow_photo').length,
      retain: manifest.entries.filter((entry) => entry.decision === 'retain_source_photo').length,
      blocked: outcomes.filter((outcome) => outcome.semanticRole === 'label_or_packaging').length,
      cropped: outcomes.filter((outcome) => outcome.selectedSource === 'cropped').length,
    },
    outcomes,
  }
  await writeFile(reportPath, `${JSON.stringify(result, null, 2)}\n`)
  process.stdout.write(`${JSON.stringify({ reportPath, ...result.summary, mode: result.mode })}\n`)
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : JSON.stringify(error, null, 2)}\n`)
  process.exitCode = 1
})
