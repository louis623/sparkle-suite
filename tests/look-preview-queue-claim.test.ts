import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  LOOK_PREVIEW_BUSY_MS,
  LOOK_PREVIEW_MAX_ATTEMPTS,
  canClaimLookPreview,
  lookPreviewAssetPaths,
  lookPreviewAssetStamp,
  lookPreviewClaimOrFilter,
  lookPreviewWriteOwnsClaim,
} from '@/lib/look-preview/policy'

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
  updated_at: string
}

const { state, captureLookPreviewShots } = vi.hoisted(() => {
  const state = {
    row: null as PreviewRow | null,
    uploads: new Map<string, Uint8Array>(),
    removed: [] as string[][],
    updateFilters: [] as Array<Record<string, unknown>>,
  }
  return { state, captureLookPreviewShots: vi.fn() }
})

function parseOrFilter(expression: string, row: PreviewRow) {
  return expression.split(',').some((part) => {
    const quoted = part.match(/^processing_started_at\.lt\."([^"]+)"$/)
    if (quoted) {
      return row.processing_started_at != null && row.processing_started_at < quoted[1]
    }
    if (part === 'processing_started_at.is.null') return row.processing_started_at == null
    throw new Error(`unsupported or-filter: ${part}`)
  })
}

function createAdminClient() {
  const from = (table: string) => {
    const filters: Array<(row: PreviewRow) => boolean> = []
    let action: 'select' | 'update' = 'select'
    let patch: Partial<PreviewRow> = {}
    const recorded: Record<string, unknown> = {}
    const query = {
      select() {
        return query
      },
      update(next: Partial<PreviewRow>) {
        action = 'update'
        patch = next
        return query
      },
      eq(column: keyof PreviewRow, value: unknown) {
        recorded[column] = value
        filters.push((row) => row[column] === value)
        return query
      },
      or(expression: string) {
        recorded.or = expression
        filters.push((row) => parseOrFilter(expression, row))
        return query
      },
      async maybeSingle() {
        if (table === 'reps') {
          return { data: { public_site_slug: 'suitesmoketest', custom_domain: null }, error: null }
        }
        if (table !== 'site_look_previews' || !state.row) return { data: null, error: null }
        const matches = filters.every((filter) => filter(state.row as PreviewRow))
        if (action === 'update') {
          state.updateFilters.push({ ...recorded })
          if (!matches) return { data: null, error: null }
          state.row = { ...(state.row as PreviewRow), ...patch }
          return { data: { ...state.row }, error: null }
        }
        return { data: matches ? { ...state.row } : null, error: null }
      },
      then(resolve: (value: unknown) => unknown, reject?: (error: unknown) => unknown) {
        return query.maybeSingle().then(resolve, reject)
      },
    }
    return query
  }
  return {
    from,
    storage: {
      from() {
        return {
          async upload(path: string, body: Uint8Array, options: { upsert?: boolean }) {
            if (!options?.upsert && state.uploads.has(path)) return { error: { message: 'exists' } }
            state.uploads.set(path, body)
            return { error: null }
          },
          getPublicUrl(path: string) {
            return { data: { publicUrl: `https://cdn.example/${path}` } }
          },
          async remove(paths: string[]) {
            state.removed.push([...paths])
            for (const path of paths) state.uploads.delete(path)
            return { error: null }
          },
        }
      },
    },
  }
}

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient }))
vi.mock('@/lib/look-preview/capture', () => ({
  captureLookPreviewShots: (...args: unknown[]) => captureLookPreviewShots(...args),
}))

import { processLookPreview } from '@/lib/look-preview/queue'

const REP_ID = 'rep-smoke-test'
const OLD_DESKTOP = `${REP_ID}/look-preview/desktop-1.webp`
const OLD_PHONE = `${REP_ID}/look-preview/phone-1.webp`

function seedRow(overrides: Partial<PreviewRow> = {}): PreviewRow {
  const queuedAt = new Date(Date.now() - 10_000).toISOString()
  const row: PreviewRow = {
    rep_id: REP_ID,
    status: 'updating',
    version: 1,
    desktop_path: OLD_DESKTOP,
    desktop_url: `https://cdn.example/${OLD_DESKTOP}`,
    phone_path: OLD_PHONE,
    phone_url: `https://cdn.example/${OLD_PHONE}`,
    captured_url: 'https://sparkle-suite-smoke.vercel.app/suitesmoketest',
    content_fingerprint: '{"appearancePreset":"amethyst"}',
    queued_at: queuedAt,
    processing_started_at: null,
    attempt_count: 0,
    last_error: null,
    updated_at: queuedAt,
    ...overrides,
  }
  state.row = row
  for (const path of [row.desktop_path, row.phone_path]) {
    if (path) state.uploads.set(path, new Uint8Array([9, 9]))
  }
  return row
}

function shotPayload(tag: string) {
  return {
    desktop: new Uint8Array([1, 2, 3]),
    phone: new Uint8Array([4, 5, 6]),
    desktopBytes: 3,
    phoneBytes: 3,
    tag,
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-26T20:00:00.000Z'))
  state.row = null
  state.uploads.clear()
  state.removed = []
  state.updateFilters = []
  captureLookPreviewShots.mockReset()
  captureLookPreviewShots.mockResolvedValue(shotPayload('default'))
  process.env.SPARKLE_ENVIRONMENT = 'smoke'
})

afterEach(() => {
  vi.useRealTimers()
  delete process.env.SPARKLE_ENVIRONMENT
})

describe('look preview claim race', () => {
  it('treats a missing or stale processing stamp as claimable, and a fresh one as busy', () => {
    const now = Date.parse('2026-11-26T20:00:00.000Z')
    expect(canClaimLookPreview(null, now)).toBe(true)
    expect(canClaimLookPreview(new Date(now - LOOK_PREVIEW_BUSY_MS).toISOString(), now)).toBe(true)
    expect(canClaimLookPreview(new Date(now - LOOK_PREVIEW_BUSY_MS + 1).toISOString(), now)).toBe(false)
    expect(lookPreviewWriteOwnsClaim('2026-11-26T20:00:00.000Z', '2026-11-26T20:00:00.000Z')).toBe(true)
    expect(lookPreviewWriteOwnsClaim(null, '2026-11-26T20:00:00.000Z')).toBe(false)
    expect(lookPreviewWriteOwnsClaim('2026-11-26T20:01:10.000Z', '2026-11-26T20:00:00.000Z')).toBe(false)
    expect(lookPreviewClaimOrFilter(now)).toContain('processing_started_at.is.null')
    expect(lookPreviewClaimOrFilter(now)).toContain('processing_started_at.lt.')
  })

  it('lets only one of two concurrent claims capture', async () => {
    seedRow()
    const results = await Promise.all([
      processLookPreview(REP_ID, { flush: true }),
      processLookPreview(REP_ID, { flush: true }),
    ])
    const ready = results.filter((result) => result.status === 'ready')
    const denied = results.filter((result) => result.status === 'in-flight')
    expect(ready).toHaveLength(1)
    expect(denied).toHaveLength(1)
    expect(captureLookPreviewShots).toHaveBeenCalledTimes(1)
    expect(state.row?.status).toBe('ready')
    expect(state.row?.desktop_path).toMatch(new RegExp(`^${REP_ID}/look-preview/desktop-2-\\d{8}T\\d{9}Z\\.webp$`))
    expect(state.row?.desktop_url).toBe(`https://cdn.example/${state.row?.desktop_path}`)
    expect(state.row?.processing_started_at).toBeNull()
    expect(state.updateFilters.some((filter) => typeof filter.or === 'string' && filter.or.includes('processing_started_at.is.null'))).toBe(true)
  })

  it('allows a stale claim older than the busy window to be reclaimed', async () => {
    const staleStarted = new Date(Date.now() - LOOK_PREVIEW_BUSY_MS - 1_000).toISOString()
    seedRow({ processing_started_at: staleStarted, attempt_count: 1, status: 'updating' })
    const result = await processLookPreview(REP_ID, { flush: true })
    expect(result.status).toBe('ready')
    expect(captureLookPreviewShots).toHaveBeenCalledTimes(1)
    expect(state.row?.status).toBe('ready')
    expect(state.row?.desktop_path).toMatch(new RegExp(`^${REP_ID}/look-preview/desktop-2-\\d{8}T\\d{9}Z\\.webp$`))
  })

  it('does not let a late loser overwrite a newer cover or restore a deleted old link', async () => {
    seedRow()
    let releaseFirst: (value: ReturnType<typeof shotPayload>) => void = () => undefined
    const firstShots = new Promise<ReturnType<typeof shotPayload>>((resolve) => {
      releaseFirst = resolve
    })
    let firstCaptureStarted: () => void = () => undefined
    const firstStarted = new Promise<void>((resolve) => {
      firstCaptureStarted = resolve
    })
    captureLookPreviewShots.mockImplementationOnce(() => {
      firstCaptureStarted()
      return firstShots
    })
    captureLookPreviewShots.mockResolvedValueOnce(shotPayload('winner'))

    const first = processLookPreview(REP_ID, { flush: true })
    await firstStarted
    const firstClaim = state.row?.processing_started_at
    expect(firstClaim).toBeTruthy()

    vi.setSystemTime(new Date(Date.now() + LOOK_PREVIEW_BUSY_MS + 1_000))
    const second = await processLookPreview(REP_ID, { flush: true })
    expect(second.status).toBe('ready')
    const winnerUrl = state.row?.desktop_url
    const winnerPath = state.row?.desktop_path
    expect(winnerPath).toMatch(new RegExp(`^${REP_ID}/look-preview/desktop-2-\\d{8}T\\d{9}Z\\.webp$`))
    expect(winnerUrl).toBe(`https://cdn.example/${winnerPath}`)
    expect(state.removed).toEqual([[OLD_DESKTOP, OLD_PHONE]])

    const firstPaths = lookPreviewAssetPaths(REP_ID, 2, firstClaim as string)
    releaseFirst(shotPayload('loser'))
    const firstResult = await first
    expect(firstResult.status).toBe('in-flight')
    expect(state.row?.status).toBe('ready')
    expect(state.row?.desktop_url).toBe(winnerUrl)
    expect(state.row?.desktop_path).toBe(winnerPath)
    expect(state.row?.desktop_url).not.toBe(`https://cdn.example/${OLD_DESKTOP}`)
    expect(state.removed).toEqual([[OLD_DESKTOP, OLD_PHONE], [firstPaths.desktopPath, firstPaths.phonePath]])
    expect(state.uploads.has(winnerPath as string)).toBe(true)
    expect(state.uploads.has(firstPaths.desktopPath)).toBe(false)
  })

  it('keeps a mid-flight recapture queued after saving the picture that was in progress', async () => {
    seedRow()
    let release: (value: ReturnType<typeof shotPayload>) => void = () => undefined
    const shots = new Promise<ReturnType<typeof shotPayload>>((resolve) => {
      release = resolve
    })
    let startedCapture: () => void = () => undefined
    const started = new Promise<void>((resolve) => {
      startedCapture = resolve
    })
    captureLookPreviewShots.mockImplementationOnce(() => {
      startedCapture()
      return shots
    })

    const run = processLookPreview(REP_ID, { flush: true })
    await started
    const claimStamp = state.row?.processing_started_at
    expect(claimStamp).toBeTruthy()
    const nextQueuedAt = new Date(Date.now() + 1_000).toISOString()
    state.row = {
      ...(state.row as PreviewRow),
      queued_at: nextQueuedAt,
      status: 'updating',
      attempt_count: 0,
      processing_started_at: claimStamp as string,
    }

    release(shotPayload('older-page'))
    const result = await run
    expect(result).toEqual({ status: 'ready', followUp: true })
    const stored = lookPreviewAssetPaths(REP_ID, 2, claimStamp as string)
    expect(state.row?.status).toBe('updating')
    expect(state.row?.attempt_count).toBe(0)
    expect(state.row?.processing_started_at).toBeNull()
    expect(state.row?.queued_at).toBe(nextQueuedAt)
    expect(state.row?.desktop_path).toBe(stored.desktopPath)
    expect(state.row?.desktop_url).toBe(`https://cdn.example/${stored.desktopPath}`)
    expect(state.removed).toEqual([[OLD_DESKTOP, OLD_PHONE]])
    expect(state.uploads.has(stored.desktopPath)).toBe(true)
    expect(state.uploads.has(OLD_DESKTOP)).toBe(false)
  })

  it('marks a stuck updating row failed once three tries are spent and the claim is stale', async () => {
    const staleStarted = new Date(Date.now() - LOOK_PREVIEW_BUSY_MS - 1_000).toISOString()
    seedRow({
      status: 'updating',
      attempt_count: LOOK_PREVIEW_MAX_ATTEMPTS,
      processing_started_at: staleStarted,
      last_error: 'capture-failed',
    })
    const result = await processLookPreview(REP_ID, { flush: true })
    expect(result.status).toBe('failed')
    expect(captureLookPreviewShots).not.toHaveBeenCalled()
    expect(state.row?.status).toBe('failed')
    expect(state.row?.attempt_count).toBe(LOOK_PREVIEW_MAX_ATTEMPTS)
    expect(state.row?.processing_started_at).toBeNull()
    expect(state.row?.desktop_url).toBe(`https://cdn.example/${OLD_DESKTOP}`)
    expect(state.row?.desktop_path).toBe(OLD_DESKTOP)

    seedRow({
      status: 'updating',
      attempt_count: LOOK_PREVIEW_MAX_ATTEMPTS,
      processing_started_at: new Date().toISOString(),
    })
    const stillBusy = await processLookPreview(REP_ID, { flush: true })
    expect(stillBusy.status).toBe('stopped')
    expect(captureLookPreviewShots).not.toHaveBeenCalled()
    expect(state.row?.status).toBe('updating')
    expect(state.row?.desktop_path).toBe(OLD_DESKTOP)
  })

  it('names uploads with the claim stamp and removes only its own files if the ready write misses', async () => {
    seedRow()
    let release: (value: ReturnType<typeof shotPayload>) => void = () => undefined
    const shots = new Promise<ReturnType<typeof shotPayload>>((resolve) => {
      release = resolve
    })
    let startedCapture: () => void = () => undefined
    const started = new Promise<void>((resolve) => {
      startedCapture = resolve
    })
    captureLookPreviewShots.mockImplementationOnce(() => {
      startedCapture()
      return shots
    })

    const run = processLookPreview(REP_ID, { flush: true })
    await started
    const claimStamp = state.row?.processing_started_at as string
    expect(lookPreviewAssetStamp(claimStamp)).toMatch(/^\d{8}T\d{6}\d{3}Z$/)
    const own = lookPreviewAssetPaths(REP_ID, 2, claimStamp)
    const winnerPath = `${REP_ID}/look-preview/desktop-9-winner.webp`
    const winnerPhone = `${REP_ID}/look-preview/phone-9-winner.webp`
    state.uploads.set(winnerPath, new Uint8Array([7]))
    state.uploads.set(winnerPhone, new Uint8Array([7]))
    state.row = {
      ...(state.row as PreviewRow),
      status: 'ready',
      version: 9,
      desktop_path: winnerPath,
      desktop_url: `https://cdn.example/${winnerPath}`,
      phone_path: winnerPhone,
      phone_url: `https://cdn.example/${winnerPhone}`,
      processing_started_at: null,
      attempt_count: 0,
    }

    release(shotPayload('late'))
    const result = await run
    expect(result.status).toBe('in-flight')
    expect(own.desktopPath).toContain(lookPreviewAssetStamp(claimStamp))
    expect(state.row?.status).toBe('ready')
    expect(state.row?.desktop_path).toBe(winnerPath)
    expect(state.uploads.has(winnerPath)).toBe(true)
    expect(state.uploads.has(OLD_DESKTOP)).toBe(true)
    expect(state.uploads.has(own.desktopPath)).toBe(false)
    expect(state.uploads.has(own.phonePath)).toBe(false)
    expect(state.removed.at(-1)).toEqual([own.desktopPath, own.phonePath])
  })
})
