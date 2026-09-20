import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'

const mocks = vi.hoisted(() => ({ admin: vi.fn(), analyze: vi.fn(), incident: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mocks.admin }))
vi.mock('@/lib/services/team-photo-analysis', () => ({ analyzeTeamPhoto: mocks.analyze }))
vi.mock('@/lib/nic-nac/guardian-telemetry', () => ({ logIncident: mocks.incident }))

import { processTeamPhotoPolish, requestTeamPhotoPolish, restoreTeamPhotoOriginal, resumeTeamPhotoEscalations, teamPhotoPolishConfig, useTeamPhotoPolish } from '@/lib/services/team-photo-polish'

const repId = '11111111-1111-4111-8111-111111111111'
const requestId = '22222222-2222-4222-8222-222222222222'
const jobId = '33333333-3333-4333-8333-333333333333'
const sourceUrl = `https://storage.test/storage/v1/object/public/public-site-media/${repId}/profile/original.jpg`

function query(result: unknown) {
  const chain: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'is', 'lt', 'update', 'order', 'limit']) chain[method] = vi.fn(() => chain)
  chain.maybeSingle = vi.fn(async () => result)
  chain.single = vi.fn(async () => result)
  chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve)
  return chain
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.stubEnv('TEAM_PHOTO_POLISH_ENABLED', 'true')
  vi.stubEnv('OPENAI_API_KEY', 'test-key')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://storage.test')
})

describe('team photo polish service', () => {
  it('records an internal Guardian flag without creating a ticket or sending a message', async () => {
    const job = { id: jobId, rep_id: repId, card_key: 'lead', attempt_number: 1, status: 'uncertain' }
    const from = vi.fn().mockReturnValueOnce(query({ data: job, error: null })).mockReturnValueOnce(query({ data: { id: jobId }, error: null }))
    mocks.admin.mockReturnValue({ from })
    const provider = vi.fn()
    vi.stubGlobal('fetch', provider)
    await resumeTeamPhotoEscalations(repId, [jobId])
    expect(mocks.incident).toHaveBeenCalledWith(expect.objectContaining({ errorType: 'team_photo_polish_uncertain', repId }))
    expect(from.mock.calls.every(([table]) => table === 'team_photo_polish_jobs')).toBe(true)
    expect(provider).not.toHaveBeenCalled()
  })

  it('is explicitly disabled without configuration', () => {
    vi.stubEnv('TEAM_PHOTO_POLISH_ENABLED', '')
    expect(teamPhotoPolishConfig().enabled).toBe(false)
    vi.stubEnv('TEAM_PHOTO_POLISH_ENABLED', 'true')
    vi.stubEnv('TEAM_PHOTO_POLISH_MONTHLY_JOB_LIMIT', '0')
    expect(teamPhotoPolishConfig().enabled).toBe(false)
  })

  it('rejects missing consent before accessing storage or reserving spend', async () => {
    await expect(requestTeamPhotoPolish(repId, { cardKey: 'lead', sourceUrl, requestId })).rejects.toThrow()
    expect(mocks.admin).not.toHaveBeenCalled()
  })

  it('replays the exact request without another quality check or reservation', async () => {
    const existing = { id: jobId, card_key: 'lead', status: 'succeeded' }
    const rpc = vi.fn()
    mocks.admin.mockReturnValue({ from: vi.fn(() => query({ data: existing, error: null })), rpc })
    expect(await requestTeamPhotoPolish(repId, { cardKey: 'lead', sourceUrl, requestId, consent: true })).toEqual(existing)
    expect(rpc).not.toHaveBeenCalled()
    expect(mocks.analyze).not.toHaveBeenCalled()
  })

  it('rejects unsuitable sources before reserving an image attempt', async () => {
    const rpc = vi.fn()
    const download = vi.fn(async () => ({ data: new Blob(['source']), error: null }))
    const from = vi.fn().mockReturnValueOnce(query({ data: null, error: null })).mockReturnValueOnce(query({ data: { profile_photo_url: sourceUrl }, error: null }))
    mocks.admin.mockReturnValue({ from, storage: { from: vi.fn(() => ({ download })) }, rpc })
    mocks.analyze.mockResolvedValue({ quality: { status: 'needs_better_photo', message: 'Choose a sharper photo.' } })
    await expect(requestTeamPhotoPolish(repId, { cardKey: 'lead', sourceUrl, requestId, consent: true })).rejects.toThrow('Choose a sharper photo.')
    expect(mocks.analyze).toHaveBeenCalledWith(Buffer.from('source'), { repId })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('rejects another card photo before analysis or generation even within the same rep folder', async () => {
    const from = vi.fn().mockReturnValueOnce(query({ data: null, error: null })).mockReturnValueOnce(query({ data: { profile_photo_url: sourceUrl.replace('original.jpg', 'different-person.jpg') }, error: null }))
    const storage = vi.fn(), rpc = vi.fn()
    mocks.admin.mockReturnValue({ from, storage: { from: storage }, rpc })
    await expect(requestTeamPhotoPolish(repId, { cardKey: 'lead', sourceUrl, requestId, consent: true })).rejects.toThrow('Save this card and its photo')
    expect(mocks.analyze).not.toHaveBeenCalled()
    expect(storage).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
  })

  it('does not call the provider when another worker already claimed the job', async () => {
    const provider = vi.fn()
    vi.stubGlobal('fetch', provider)
    mocks.admin.mockReturnValue({ from: vi.fn(() => query({ data: null, error: null })) })
    await processTeamPhotoPolish(repId, jobId)
    expect(provider).not.toHaveBeenCalled()
  })

  it('never automatically retries an ambiguous image provider timeout', async () => {
    const job = { id: jobId, rep_id: repId, card_key: 'lead', attempt_number: 1, source_path: `${repId}/profile/original.jpg`, source_sha256: createHash('sha256').update('source').digest('hex'), skin_id: 'amethyst', model: 'test', status: 'queued' }
    const statusSave = query({ data: null, error: null })
    const from = vi.fn().mockReturnValueOnce(query({ data: job, error: null })).mockReturnValue(statusSave)
    const download = vi.fn(async () => ({ data: new Blob(['source']), error: null }))
    mocks.admin.mockReturnValue({ from, storage: { from: vi.fn(() => ({ download })) } })
    const provider = vi.fn().mockRejectedValue(new Error('timeout'))
    vi.stubGlobal('fetch', provider)
    await processTeamPhotoPolish(repId, jobId)
    expect(provider).toHaveBeenCalledTimes(1)
    expect(statusSave.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'uncertain' }))
  })

  it('requires an owned completed preview before copying anything public', async () => {
    const selected = query({ data: null, error: null })
    const storage = vi.fn()
    mocks.admin.mockReturnValue({ from: vi.fn(() => selected), storage: { from: storage } })
    await expect(useTeamPhotoPolish(repId, 'lead', jobId)).rejects.toThrow('Choose a finished photo')
    expect(selected.eq).toHaveBeenCalledWith('rep_id', repId)
    expect(selected.eq).toHaveBeenCalledWith('card_key', 'lead')
    expect(storage).not.toHaveBeenCalled()
  })

  it('keeps an exact member UUID instead of inferring the lead by name', async () => {
    const memberId = '44444444-4444-4444-8444-444444444444'
    const selected = query({ data: null, error: null })
    const from = vi.fn().mockReturnValueOnce(query({ data: { id: memberId }, error: null })).mockReturnValueOnce(selected)
    mocks.admin.mockReturnValue({ from })
    await expect(useTeamPhotoPolish(repId, memberId, jobId)).rejects.toThrow('Choose a finished photo')
    expect(selected.eq).toHaveBeenCalledWith('card_key', memberId)
    expect(from).not.toHaveBeenCalledWith('reps')
  })

  it('will not restore another card or tenant job and never chooses the newest source', async () => {
    const selected = query({ data: null, error: null })
    const storage = vi.fn()
    mocks.admin.mockReturnValue({ from: vi.fn(() => selected), storage: { from: storage } })
    await expect(restoreTeamPhotoOriginal(repId, 'lead', { jobId })).rejects.toThrow('does not belong')
    expect(selected.eq).toHaveBeenCalledWith('id', jobId)
    expect(selected.eq).toHaveBeenCalledWith('rep_id', repId)
    expect(selected.eq).toHaveBeenCalledWith('card_key', 'lead')
    expect(selected.order).not.toHaveBeenCalled()
    expect(storage).not.toHaveBeenCalled()
  })

  it('restores the exact approved older job source, never a more recent upload', async () => {
    const approvedPath = `${repId}/profile/polished-${jobId}.jpg`
    const originalPath = `${repId}/profile/first-person-original.jpg`
    const root = 'https://storage.test/storage/v1/object/public/public-site-media/'
    const selected = query({ data: { source_path: originalPath, approved_path: approvedPath }, error: null })
    mocks.admin.mockReturnValue({ from: vi.fn(() => selected), storage: { from: vi.fn(() => ({ getPublicUrl: (path: string) => ({ data: { publicUrl: root + path } }) })) } })
    expect(await restoreTeamPhotoOriginal(repId, 'lead', { currentImageUrl: root + approvedPath })).toEqual({ imageUrl: root + originalPath })
    expect(selected.eq).toHaveBeenCalledWith('id', jobId)
    await expect(restoreTeamPhotoOriginal(repId, 'lead', { currentImageUrl: 'https://attacker.test/profile/polished-' + jobId + '.jpg' })).rejects.toThrow('does not belong')
  })
})
