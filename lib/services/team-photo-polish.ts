import 'server-only'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAmethystSkinCard } from '@/lib/amethyst/skin-cards'
import { analyzeTeamPhoto } from '@/lib/services/team-photo-analysis'
import { logIncident } from '@/lib/nic-nac/guardian-telemetry'
import { TEAM_PHOTO_MAX_ATTEMPTS, TEAM_PHOTO_POLISH_MODEL, photoPolishError, photoPolishPrompt, teamPhotoSourcePath } from './team-photo-polish-policy'

const TABLE = 'team_photo_polish_jobs'
const PREVIEW_BUCKET = 'team-photo-previews'
const PUBLIC_BUCKET = 'public-site-media'
const cardSchema = z.union([z.literal('lead'), z.string().uuid()])
const generateSchema = z.object({ cardKey: cardSchema, sourceUrl: z.string().url().max(2048), requestId: z.string().uuid(), consent: z.literal(true) })

type Job = {
  id: string; rep_id: string; card_key: string; request_id: string; attempt_number: number
  source_path: string; source_sha256: string; skin_id: string; model: string
  status: 'queued' | 'processing' | 'succeeded' | 'failed' | 'uncertain'
  preview_path: string | null; approved_path: string | null; error_message: string | null
  notification_status: string | null; support_conversation_id: string | null
  created_at: string; started_at: string | null
}

export function teamPhotoPolishConfig() {
  const configured = Number(process.env.TEAM_PHOTO_POLISH_MONTHLY_JOB_LIMIT ?? 100)
  const monthlyLimit = Number.isInteger(configured) && configured > 0 ? Math.min(configured, 10000) : 0
  return {
    enabled: process.env.TEAM_PHOTO_POLISH_ENABLED === 'true' && Boolean(process.env.OPENAI_API_KEY) && monthlyLimit > 0,
    monthlyLimit,
    model: process.env.TEAM_PHOTO_POLISH_MODEL?.trim() || TEAM_PHOTO_POLISH_MODEL,
  }
}

async function assertCard(admin: SupabaseClient, repId: string, rawCard: string) {
  const cardKey = cardSchema.parse(rawCard)
  if (cardKey !== 'lead') {
    const result = await admin.from('join_team_members').select('id').eq('id', cardKey).eq('rep_id', repId).maybeSingle()
    if (result.error) throw result.error
    if (!result.data) throw photoPolishError('CARD_NOT_FOUND', 'Save this team member before polishing their photo.', 404)
  }
  return cardKey
}

function publicUrl(admin: SupabaseClient, path: string) {
  return admin.storage.from(PUBLIC_BUCKET).getPublicUrl(path).data.publicUrl
}

async function downloadSource(admin: SupabaseClient, path: string) {
  const result = await admin.storage.from(PUBLIC_BUCKET).download(path)
  if (result.error || !result.data) throw photoPolishError('PHOTO_NOT_FOUND', 'That photo could not be loaded. Please upload it again.', 404)
  if (result.data.size > 10 * 1024 * 1024) throw photoPolishError('PHOTO_TOO_LARGE', 'Choose a photo smaller than 10 MB.')
  return Buffer.from(await result.data.arrayBuffer())
}

async function assertSavedPhotoSource(admin: SupabaseClient, repId: string, cardKey: string, sourceUrl: string, sourcePath: string) {
  const current = cardKey === 'lead'
    ? await admin.from('reps').select('profile_photo_url').eq('id', repId).maybeSingle()
    : await admin.from('join_team_members').select('photo_url').eq('id', cardKey).eq('rep_id', repId).maybeSingle()
  if (current.error) throw current.error
  const savedPhoto = current.data
  const savedUrl = String(savedPhoto ? ('profile_photo_url' in savedPhoto ? savedPhoto.profile_photo_url : savedPhoto.photo_url) ?? '' : '')
  if (savedUrl === sourceUrl) return
  // A retry after approving a result must return to that result's exact original.
  const approvedId = /\/polished-([a-f0-9-]{36})\.jpg$/.exec(savedUrl)?.[1]
  if (approvedId) {
    const approved = await admin.from(TABLE).select('source_path,approved_path').eq('id', approvedId).eq('rep_id', repId).eq('card_key', cardKey).maybeSingle()
    if (approved.error) throw approved.error
    if (approved.data?.source_path === sourcePath && approved.data.approved_path && publicUrl(admin, approved.data.approved_path) === savedUrl) return
  }
  throw photoPolishError('PHOTO_SAVE_REQUIRED', 'Save this card and its photo before polishing. Each portrait must stay with its own team member.', 409)
}

export async function requestTeamPhotoPolish(repId: string, input: unknown) {
  const parsed = generateSchema.parse(input)
  const admin = createAdminClient()
  const cardKey = await assertCard(admin, repId, parsed.cardKey)
  // A response lost in transit must resolve to the prior reservation, not bill again.
  const replay = await admin.from(TABLE).select('*').eq('rep_id', repId).eq('request_id', parsed.requestId).maybeSingle()
  if (replay.error) throw replay.error
  if (replay.data) {
    if (replay.data.card_key !== cardKey) throw photoPolishError('REQUEST_CONFLICT', 'Start a new photo request for this card.', 409)
    return replay.data as Job
  }
  const config = teamPhotoPolishConfig()
  if (!config.enabled) throw photoPolishError('PHOTO_POLISH_UNAVAILABLE', 'Photo polish is temporarily unavailable. You can use your original photo or contact Help & Support.', 503)
  const sourcePath = teamPhotoSourcePath(parsed.sourceUrl, repId, process.env.NEXT_PUBLIC_SUPABASE_URL!)
  await assertSavedPhotoSource(admin, repId, cardKey, parsed.sourceUrl, sourcePath)
  const source = await downloadSource(admin, sourcePath)
  const analysis = await analyzeTeamPhoto(source, { repId })
  if (analysis.quality.status !== 'ready') throw photoPolishError('PHOTO_QUALITY_REQUIRED', analysis.quality.message, 422)
  const skin = await admin.from('site_settings').select('appearance_preset').eq('rep_id', repId).maybeSingle()
  if (skin.error) throw skin.error
  const skinId = getAmethystSkinCard(skin.data?.appearance_preset).id
  const reserved = await admin.rpc('reserve_team_photo_polish', {
    p_rep_id: repId, p_card_key: cardKey, p_request_id: parsed.requestId,
    p_source_path: sourcePath, p_source_sha256: createHash('sha256').update(source).digest('hex'),
    p_skin_id: skinId, p_model: config.model, p_monthly_limit: config.monthlyLimit,
  })
  if (reserved.error) {
    const message = reserved.error.message ?? ''
    if (message.includes('PHOTO_LIMIT_REACHED')) throw photoPolishError('PHOTO_LIMIT_REACHED', 'You have used the original polish and all three retries. Send a Need Help message through Help & Support in your Workspace for help finishing this photo.', 429)
    if (message.includes('PHOTO_ALREADY_PENDING')) throw photoPolishError('PHOTO_ALREADY_PENDING', 'A photo request is already in progress or needs support review. Please check its status.', 409)
    if (message.includes('PHOTO_BUDGET_REACHED')) throw photoPolishError('PHOTO_BUDGET_REACHED', 'Photo polish has reached its shared allowance for this month. Use your original or contact Help & Support.', 429)
    if (message.includes('PHOTO_DAILY_BUDGET_REACHED')) throw photoPolishError('PHOTO_DAILY_BUDGET_REACHED', 'Photo polish has reached its shared allowance for today. Use your original, try tomorrow, or contact Help & Support.', 429)
    throw reserved.error
  }
  return (Array.isArray(reserved.data) ? reserved.data[0] : reserved.data) as Job
}

async function escalateJob(admin: SupabaseClient, job: Job) {
  // Attempt-four incidents are created atomically by the reservation function.
  // Only flag uncertain jobs here. Tickets and messages are initiated by the rep
  // through Workspace Help & Support; this feature never opens or sends one.
  if (job.status !== 'uncertain') return
  // Retain the already-deployed column as an internal once-only marker, without
  // claiming that any external notification was sent.
  const claimed = await admin.from(TABLE).update({ notification_status: 'not_configured' }).eq('id', job.id).is('notification_status', null).select('id').maybeSingle()
  if (claimed.error) throw claimed.error
  if (!claimed.data) return
  await logIncident({ errorType: 'team_photo_polish_uncertain', repId: job.rep_id, severity: 'warn', details: { jobId: job.id, cardKey: job.card_key } })
}

/** Exactly one compare-and-set claims a queued job. No automatic image API retries. */
export async function processTeamPhotoPolish(repId: string, jobId: string) {
  const admin = createAdminClient()
  const claimed = await admin.from(TABLE).update({ status: 'processing', started_at: new Date().toISOString() }).eq('id', jobId).eq('rep_id', repId).eq('status', 'queued').select('*').maybeSingle()
  if (claimed.error) throw claimed.error
  if (!claimed.data) return
  const job = claimed.data as Job
  let providerStarted = false
  let providerRejected = false
  try {
    if (!teamPhotoPolishConfig().enabled) throw new Error('polish disabled')
    const source = await downloadSource(admin, job.source_path)
    if (createHash('sha256').update(source).digest('hex') !== job.source_sha256) throw new Error('source changed')
    const form = new FormData()
    form.set('model', job.model)
    form.set('image', new Blob([new Uint8Array(source)], { type: 'image/jpeg' }), 'portrait.jpg')
    form.set('prompt', photoPolishPrompt(getAmethystSkinCard(job.skin_id)))
    form.set('quality', 'medium')
    form.set('size', '1024x1024')
    form.set('n', '1')
    providerStarted = true
    const response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form, signal: AbortSignal.timeout(210_000),
    })
    const requestId = response.headers.get('x-request-id')
    await admin.from(TABLE).update({ provider_request_id: requestId }).eq('id', job.id)
    if (!response.ok) {
      providerRejected = response.status >= 400 && response.status < 500
      throw new Error('provider response failed')
    }
    const result = await response.json() as { data?: { b64_json?: string }[]; usage?: Record<string, unknown> }
    const encoded = result.data?.[0]?.b64_json
    if (!encoded || encoded.length > 20 * 1024 * 1024) throw new Error('invalid provider result')
    const image = await sharp(Buffer.from(encoded, 'base64'), { limitInputPixels: 16_000_000 }).rotate().resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 92 }).toBuffer()
    const path = `${repId}/${job.id}.jpg`
    const upload = await admin.storage.from(PREVIEW_BUCKET).upload(path, image, { contentType: 'image/jpeg', upsert: false })
    if (upload.error) throw upload.error
    const finished = await admin.from(TABLE).update({ status: 'succeeded', preview_path: path, usage: result.usage ?? null, completed_at: new Date().toISOString() }).eq('id', job.id).eq('status', 'processing')
    if (finished.error) throw finished.error
    job.status = 'succeeded'
  } catch {
    job.status = providerStarted && !providerRejected ? 'uncertain' : 'failed'
    const errorMessage = job.status === 'uncertain'
      ? 'We could not confirm whether your photo finished. Please contact Help & Support before trying again; your original is safe.'
      : 'Your photo could not be polished. Your original is safe. You can choose another photo or contact Help & Support.'
    const failed = await admin.from(TABLE).update({ status: job.status, error_message: errorMessage, completed_at: new Date().toISOString() }).eq('id', job.id).eq('status', 'processing')
    if (failed.error) console.error('[team-photo-polish] status save failed', job.id)
  }
  await escalateJob(admin, job)
}

export async function getTeamPhotoPolish(repId: string, rawCard: string) {
  const admin = createAdminClient()
  const cardKey = await assertCard(admin, repId, rawCard)
  // If a server was terminated after submission, never silently submit again.
  const stale = await admin.from(TABLE).update({ status: 'uncertain', error_message: 'This photo needs a status check. Contact Help & Support before trying again.', completed_at: new Date().toISOString() }).eq('rep_id', repId).eq('card_key', cardKey).eq('status', 'processing').lt('started_at', new Date(Date.now() - 5 * 60_000).toISOString())
  if (stale.error) throw stale.error
  const result = await admin.from(TABLE).select('*').eq('rep_id', repId).eq('card_key', cardKey).order('attempt_number', { ascending: false })
  if (result.error) throw result.error
  const rows = (result.data ?? []) as Job[]
  const jobs = await Promise.all(rows.map(async (job) => {
    const preview = job.preview_path ? await admin.storage.from(PREVIEW_BUCKET).createSignedUrl(job.preview_path, 900) : null
    return { id: job.id, status: job.status, attemptNumber: job.attempt_number, imageUrl: preview?.data?.signedUrl, originalUrl: publicUrl(admin, job.source_path), approvedImageUrl: job.approved_path ? publicUrl(admin, job.approved_path) : undefined, error: job.error_message ?? undefined }
  }))
  const flagged = rows.find((job) => job.attempt_number === TEAM_PHOTO_MAX_ATTEMPTS || job.status === 'uncertain')
  return {
    enabled: teamPhotoPolishConfig().enabled, attemptsUsed: rows.length, maxAttempts: TEAM_PHOTO_MAX_ATTEMPTS,
    remainingAttempts: Math.max(0, TEAM_PHOTO_MAX_ATTEMPTS - rows.length), jobs,
    supportRequired: Boolean(flagged),
    // Server-only work descriptions; route does not expose internal storage rows.
    pendingJobIds: rows.filter((job) => job.status === 'queued').map((job) => job.id),
    escalationJobIds: rows.filter((job) => !job.notification_status && job.status === 'uncertain').map((job) => job.id),
  }
}

export async function resumeTeamPhotoEscalations(repId: string, ids: string[]) {
  const admin = createAdminClient()
  for (const id of ids) {
    const result = await admin.from(TABLE).select('*').eq('id', id).eq('rep_id', repId).maybeSingle()
    if (result.data) await escalateJob(admin, result.data as Job)
  }
}

export async function useTeamPhotoPolish(repId: string, rawCard: string, jobId: string) {
  const admin = createAdminClient()
  const cardKey = await assertCard(admin, repId, rawCard)
  const result = await admin.from(TABLE).select('*').eq('id', z.string().uuid().parse(jobId)).eq('rep_id', repId).eq('card_key', cardKey).maybeSingle()
  const job = result.data as Job | null
  if (result.error) throw result.error
  if (!job || job.status !== 'succeeded' || !job.preview_path) throw photoPolishError('PHOTO_NOT_READY', 'Choose a finished photo preview first.', 409)
  if (job.approved_path) return { imageUrl: publicUrl(admin, job.approved_path) }
  const preview = await admin.storage.from(PREVIEW_BUCKET).download(job.preview_path)
  if (preview.error || !preview.data) throw photoPolishError('PHOTO_NOT_FOUND', 'The photo preview could not be loaded.', 404)
  const approvedPath = `${repId}/profile/polished-${job.id}.jpg`
  // Repeated explicit approval is idempotent and never changes the saved original.
  const upload = await admin.storage.from(PUBLIC_BUCKET).upload(approvedPath, preview.data, { contentType: 'image/jpeg', upsert: true })
  if (upload.error) throw upload.error
  const saved = await admin.from(TABLE).update({ approved_path: approvedPath }).eq('id', job.id).eq('rep_id', repId)
  if (saved.error) throw saved.error
  return { imageUrl: publicUrl(admin, approvedPath) }
}

export async function restoreTeamPhotoOriginal(repId: string, rawCard: string, input: { jobId?: string; currentImageUrl?: string }) {
  const admin = createAdminClient()
  const cardKey = await assertCard(admin, repId, rawCard)
  let jobId = input?.jobId ? z.string().uuid().parse(input.jobId) : undefined
  if (!jobId && input?.currentImageUrl) {
    // The approved URL carries the immutable job ID. Derive, then require a
    // byte-for-byte owned URL match below; never fall back to the latest job.
    const match = /\/polished-([a-f0-9-]{36})\.jpg$/.exec(input.currentImageUrl)
    if (match) jobId = z.string().uuid().parse(match[1])
  }
  if (!jobId) throw photoPolishError('PHOTO_ORIGINAL_REQUIRED', 'Choose the polished photo whose original you want to restore.', 400)
  const result = await admin.from(TABLE).select('source_path,approved_path').eq('id', jobId).eq('rep_id', repId).eq('card_key', cardKey).maybeSingle()
  if (result.error) throw result.error
  if (!result.data) throw photoPolishError('PHOTO_NOT_FOUND', 'That original does not belong to this team card.', 404)
  if (input.currentImageUrl && (!result.data.approved_path || publicUrl(admin, result.data.approved_path) !== input.currentImageUrl)) {
    throw photoPolishError('PHOTO_NOT_FOUND', 'That original does not belong to this team card.', 404)
  }
  return { imageUrl: publicUrl(admin, result.data.source_path) }
}
