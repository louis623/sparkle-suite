import { createAdminClient } from '@/lib/supabase/admin'
import { captureLookPreviewShots } from '@/lib/look-preview/capture'
import {
  LOOK_PREVIEW_BUSY_MS,
  LOOK_PREVIEW_DEBOUNCE_MS,
  LOOK_PREVIEW_MAX_ATTEMPTS,
  chooseLookPreviewCandidate,
  SMOKE_PUBLIC_ORIGIN,
  applyLookPreviewFailure,
  applyLookPreviewSkip,
  buildLookPreviewCaptureUrl,
  isMissingLookPreviewTable,
  lookPreviewFailureDetails,
  lookPreviewFingerprint,
  shouldQueueLookPreview,
} from '@/lib/look-preview/policy'
import type { SiteSettingsDashboardResult } from '@/lib/services/types'

type PreviewRow = {
  rep_id: string
  status: 'missing' | 'updating' | 'ready' | 'failed' | 'skipped'
  version: number
  desktop_path: string | null
  desktop_url: string | null
  phone_path: string | null
  phone_url: string | null
  captured_url: string | null
  content_fingerprint: string | null
  queued_at: string | null
  processing_started_at: string | null
  attempt_count: number
  last_error: string | null
}

export type LookPreviewPublic = {
  status: PreviewRow['status']
  desktopUrl: string | null
  phoneUrl: string | null
}

function publicPreview(row: PreviewRow | null): LookPreviewPublic | null {
  if (!row) return null
  return { status: row.status, desktopUrl: row.desktop_url, phoneUrl: row.phone_url }
}

function withPreview(settings: SiteSettingsDashboardResult, row: PreviewRow | null): SiteSettingsDashboardResult {
  const lookPreview = publicPreview(row)
  return lookPreview ? { ...settings, lookPreview } : settings
}

async function readRow(repId: string) {
  const admin = createAdminClient()
  const result = await admin.from('site_look_previews').select('*').eq('rep_id', repId).maybeSingle()
  if (isMissingLookPreviewTable(result.error)) return { missingTable: true as const, row: null }
  if (result.error) throw result.error
  return { missingTable: false as const, row: (result.data as PreviewRow | null) ?? null }
}

export async function readLookPreview(repId: string) {
  const loaded = await readRow(repId)
  if (loaded.missingTable) return null
  return publicPreview(loaded.row)
}

export async function attachLookPreview(repId: string, settings: SiteSettingsDashboardResult) {
  try {
    const loaded = await readRow(repId)
    if (loaded.missingTable) return { settings, schedule: false }
    if (!loaded.row) {
      const inserted = await createAdminClient().from('site_look_previews').insert({
        rep_id: repId,
        status: 'updating',
        content_fingerprint: lookPreviewFingerprint(settings),
        queued_at: new Date().toISOString(),
        attempt_count: 0,
        updated_at: new Date().toISOString(),
      }).select('*').maybeSingle()
      if (isMissingLookPreviewTable(inserted.error)) return { settings, schedule: false }
      if (inserted.error) throw inserted.error
      return { settings: withPreview(settings, inserted.data as PreviewRow), schedule: true }
    }
    return { settings: withPreview(settings, loaded.row), schedule: false }
  } catch (error) {
    if (isMissingLookPreviewTable(error as { code?: string; message?: string })) {
      return { settings, schedule: false }
    }
    console.info(JSON.stringify({ scope: 'look-preview', status: 'read-skipped', repId }))
    return { settings, schedule: false }
  }
}

export async function noteLookPreviewSave(repId: string, settings: SiteSettingsDashboardResult) {
  try {
    const loaded = await readRow(repId)
    if (loaded.missingTable) return { settings, schedule: false }
    const nextFingerprint = lookPreviewFingerprint(settings)
    if (loaded.row && !shouldQueueLookPreview(loaded.row.content_fingerprint, nextFingerprint)) {
      return { settings: withPreview(settings, loaded.row), schedule: false }
    }
    const admin = createAdminClient()
    const saved = await admin.from('site_look_previews').upsert({
      rep_id: repId,
      status: 'updating',
      version: loaded.row?.version ?? 0,
      desktop_path: loaded.row?.desktop_path ?? null,
      desktop_url: loaded.row?.desktop_url ?? null,
      phone_path: loaded.row?.phone_path ?? null,
      phone_url: loaded.row?.phone_url ?? null,
      content_fingerprint: nextFingerprint,
      queued_at: new Date().toISOString(),
      attempt_count: 0,
      last_error: null,
      updated_at: new Date().toISOString(),
    }).select('*').maybeSingle()
    if (isMissingLookPreviewTable(saved.error)) return { settings, schedule: false }
    if (saved.error) throw saved.error
    return { settings: withPreview(settings, saved.data as PreviewRow), schedule: true }
  } catch (error) {
    if (isMissingLookPreviewTable(error as { code?: string; message?: string })) {
      return { settings, schedule: false }
    }
    console.info(JSON.stringify({ scope: 'look-preview', status: 'queue-skipped', repId }))
    return { settings, schedule: false }
  }
}

export async function flushLookPreview(repId: string) {
  try {
    const loaded = await readRow(repId)
    if (loaded.missingTable || !loaded.row) return { ok: true, skipped: true }
    const queuedAt = new Date(Date.now() - LOOK_PREVIEW_DEBOUNCE_MS - 1000).toISOString()
    const saved = await createAdminClient().from('site_look_previews').update({
      status: 'updating',
      queued_at: queuedAt,
      updated_at: new Date().toISOString(),
    }).eq('rep_id', repId)
    if (isMissingLookPreviewTable(saved.error)) return { ok: true, skipped: true }
    if (saved.error) throw saved.error
    return { ok: true, skipped: false }
  } catch (error) {
    if (isMissingLookPreviewTable(error as { code?: string; message?: string })) {
      return { ok: true, skipped: true }
    }
    return { ok: true, skipped: true }
  }
}

function smokeEnvironment() {
  return process.env.SPARKLE_ENVIRONMENT === 'smoke' || process.env.NEXT_PUBLIC_SPARKLE_ENVIRONMENT === 'smoke'
}

export async function processLookPreview(repId: string, options: { flush?: boolean } = {}) {
  const started = Date.now()
  const loaded = await readRow(repId)
  if (loaded.missingTable || !loaded.row?.queued_at) return { status: 'skipped' as const }
  const row = loaded.row
  const queuedAt = new Date(String(row.queued_at)).getTime()
  if (!options.flush && Date.now() - queuedAt < LOOK_PREVIEW_DEBOUNCE_MS) return { status: 'waiting' as const }
  if (row.status === 'skipped') return { status: 'skipped' as const }
  if (row.attempt_count >= LOOK_PREVIEW_MAX_ATTEMPTS) return { status: 'stopped' as const }
  const busy = row.processing_started_at && Date.now() - new Date(row.processing_started_at).getTime() < LOOK_PREVIEW_BUSY_MS
  if (busy) return { status: 'in-flight' as const }

  const admin = createAdminClient()
  const claim = await admin.from('site_look_previews').update({
    status: 'updating',
    attempt_count: row.attempt_count + 1,
    processing_started_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('rep_id', repId).eq('queued_at', row.queued_at).select('*').maybeSingle()
  if (claim.error || !claim.data) return { status: 'in-flight' as const }
  const claimed = claim.data as PreviewRow

  const rep = await admin.from('reps').select('public_site_slug, custom_domain').eq('id', repId).maybeSingle()
  if (rep.error || !rep.data?.public_site_slug) {
    await markFailed(repId, claimed)
    return { status: 'failed' as const }
  }
  const smoke = smokeEnvironment()
  let captureUrl = ''
  try {
    captureUrl = buildLookPreviewCaptureUrl({
      slug: rep.data.public_site_slug,
      customDomain: smoke ? null : rep.data.custom_domain,
      smoke,
    })
    const host = new URL(captureUrl).hostname
    const shots = await captureLookPreviewShots(captureUrl, {
      allowedHosts: [host, new URL(SMOKE_PUBLIC_ORIGIN).hostname, 'www.yoursparklesuite.com'],
    })
    if (!('desktop' in shots)) {
      if (shots.reason === 'page-missing' || shots.reason === 'blank') {
        await markSkipped(repId, claimed, shots.reason)
        console.info(JSON.stringify({ scope: 'look-preview', slug: rep.data.public_site_slug, status: 'skipped', reason: shots.reason, durationMs: Date.now() - started }))
        return { status: 'skipped' as const }
      }
      await markFailed(repId, claimed)
      console.info(JSON.stringify({ scope: 'look-preview', slug: rep.data.public_site_slug, status: 'page-not-ready', durationMs: Date.now() - started }))
      return { status: 'failed' as const }
    }
    const version = (claimed.version ?? 0) + 1
    const desktopPath = `${repId}/look-preview/desktop-${version}.webp`
    const phonePath = `${repId}/look-preview/phone-${version}.webp`
    const bucket = admin.storage.from('public-site-media')
    const uploaded = await Promise.all([
      bucket.upload(desktopPath, shots.desktop, { contentType: 'image/webp', upsert: false }),
      bucket.upload(phonePath, shots.phone, { contentType: 'image/webp', upsert: false }),
    ])
    if (uploaded.some((item) => item.error)) throw new Error('upload-failed')
    const desktopUrl = bucket.getPublicUrl(desktopPath).data.publicUrl
    const phoneUrl = bucket.getPublicUrl(phonePath).data.publicUrl
    const saved = await admin.from('site_look_previews').update({
      status: 'ready',
      version,
      desktop_path: desktopPath,
      desktop_url: desktopUrl,
      phone_path: phonePath,
      phone_url: phoneUrl,
      captured_url: captureUrl,
      attempt_count: 0,
      last_error: null,
      processing_started_at: null,
      updated_at: new Date().toISOString(),
    }).eq('rep_id', repId).select('queued_at').maybeSingle()
    if (saved.error) throw saved.error
    const previous = [claimed.desktop_path, claimed.phone_path].filter((path): path is string => Boolean(path))
    if (previous.length) await bucket.remove(previous)
    console.info(JSON.stringify({
      scope: 'look-preview',
      slug: rep.data.public_site_slug,
      status: 'ready',
      durationMs: Date.now() - started,
      desktopBytes: shots.desktopBytes,
      phoneBytes: shots.phoneBytes,
    }))
    return { status: 'ready' as const, followUp: saved.data?.queued_at !== claimed.queued_at }
  } catch (error) {
    await markFailed(repId, claimed)
    console.error(JSON.stringify({
      scope: 'look-preview',
      slug: rep.data.public_site_slug,
      status: 'capture-failed',
      ...lookPreviewFailureDetails(error),
      durationMs: Date.now() - started,
    }))
    return { status: 'failed' as const }
  }
}

async function markSkipped(repId: string, claimed: PreviewRow, reason: 'page-missing' | 'blank') {
  const skipped = applyLookPreviewSkip({
    desktopUrl: claimed.desktop_url,
    phoneUrl: claimed.phone_url,
  }, reason)
  const admin = createAdminClient()
  const saved = await admin.from('site_look_previews').update({
    status: skipped.status,
    desktop_url: skipped.desktopUrl,
    phone_url: skipped.phoneUrl,
    desktop_path: claimed.desktop_path,
    phone_path: claimed.phone_path,
    attempt_count: skipped.attemptCount,
    last_error: skipped.lastError,
    processing_started_at: null,
    updated_at: new Date().toISOString(),
  }).eq('rep_id', repId)
  if (!saved.error) return
  await admin.from('site_look_previews').update({
    status: 'failed',
    desktop_url: claimed.desktop_url,
    phone_url: claimed.phone_url,
    desktop_path: claimed.desktop_path,
    phone_path: claimed.phone_path,
    attempt_count: LOOK_PREVIEW_MAX_ATTEMPTS,
    last_error: `skipped: ${reason}`,
    processing_started_at: null,
    updated_at: new Date().toISOString(),
  }).eq('rep_id', repId)
}

async function markFailed(repId: string, claimed: PreviewRow) {
  const failed = applyLookPreviewFailure({
    desktopUrl: claimed.desktop_url,
    phoneUrl: claimed.phone_url,
    attemptCount: Math.max(0, claimed.attempt_count - 1),
  })
  await createAdminClient().from('site_look_previews').update({
    status: failed.status,
    desktop_url: failed.desktopUrl,
    phone_url: failed.phoneUrl,
    desktop_path: claimed.desktop_path,
    phone_path: claimed.phone_path,
    attempt_count: failed.attemptCount,
    last_error: failed.lastError,
    processing_started_at: null,
    updated_at: new Date().toISOString(),
  }).eq('rep_id', repId)
}

export async function processDueLookPreviews(limit = 1) {
  const admin = createAdminClient()
  const now = Date.now()
  const dueBefore = new Date(now - LOOK_PREVIEW_DEBOUNCE_MS).toISOString()
  const result = await admin.from('site_look_previews')
    .select('rep_id, attempt_count, status, updated_at, processing_started_at')
    .in('status', ['updating', 'failed', 'missing'])
    .lte('queued_at', dueBefore)
    .lt('attempt_count', LOOK_PREVIEW_MAX_ATTEMPTS)
    .order('attempt_count', { ascending: true })
    .order('updated_at', { ascending: true })
    .limit(20)
  if (isMissingLookPreviewTable(result.error)) return { processed: 0, missingTable: true }
  if (result.error) throw result.error
  const ranked = (result.data ?? []).map((row) => ({
    repId: row.rep_id as string,
    attemptCount: row.attempt_count as number,
    updatedAtMs: new Date(row.updated_at as string).getTime(),
    processingStartedAtMs: row.processing_started_at ? new Date(row.processing_started_at as string).getTime() : null,
  }))
  const next = chooseLookPreviewCandidate(ranked, now)
  if (!next) return { processed: 0, missingTable: false }
  await processLookPreview(next.repId, { flush: true })
  return { processed: Math.min(1, limit), missingTable: false }
}
