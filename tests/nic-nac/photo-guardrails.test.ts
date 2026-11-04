import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { TradeBoardIntakeSessionState } from '@/lib/nic-nac/workflows/trade-board-intake-types'

const { processPhoto, updateSession } = vi.hoisted(() => ({ processPhoto: vi.fn(), updateSession: vi.fn() }))
vi.mock('@/lib/services/listing-photo-processing', () => ({ processRepListingPhotoUrl: processPhoto }))
vi.mock('@/lib/nic-nac/workflows/trade-board-intake-store', () => ({ updateTradeBoardIntakeSession: updateSession }))
import { applyMainPhotoConfirmation, mainPhotoProblem } from '@/lib/nic-nac/workflows/trade-board-intake-controller'
import { getCurrentPiecePhotos, resolveWorkflowCustomerFacingPhoto, workflowPieceKey } from '@/lib/nic-nac/workflows/workflow-photo-selection'
import { assertMainPhotoNotReused, processListingPhotoForAdd, requireConfirmedMainPhoto } from '@/lib/nic-nac/tools/add-listing'
import { prepareTradeBoardMainPhotoPreview } from '@/lib/nic-nac/workflows/trade-board-intake-context'
import { MainPhotoPreview } from '@/app/nic-nac/components/MainPhotoPreview'

const url = 'data:image/png;base64,cGhvdG8tQQ=='
const hash = createHash('sha256').update('photo-A').digest('hex')
function state(): TradeBoardIntakeSessionState {
  return { id: 'intake-A', repId: 'rep', conversationId: 'conversation', workflowType: 'trade_board_add_listing',
    catalogMode: 'item_number', status: 'active', phase: 'ready_to_add',
    known: { itemNumber: 'RG12345', designName: 'A', collectionName: 'Originals', rarityClassification: 'standard', ringSize: '7' },
    missing: [], blockers: [], warnings: [], lastUserMessageId: 'details-A',
    metadata: { photoBindings: { 'photo-A': 'RG12345', 'photo-B': 'RG99999' } },
    photos: [{ id: 'photo-A', conversationMessageId: 'details-A', attachmentIndex: 1, declaredRole: 'jewelry_front',
      visualRole: 'jewelry', quality: 'usable', qualityIssues: [], notes: [], roleConfirmed: true, imageUrl: url, contentSha256: hash }] }
}
const db = {} as SupabaseClient
async function preview(s: TradeBoardIntakeSessionState) { return prepareTradeBoardMainPhotoPreview(db, s, 'assistant-preview-A') }
function yes(s: TradeBoardIntakeSessionState, hasAttachment = false) {
  s.metadata = applyMainPhotoConfirmation(s, { id: 'yes-A', text: 'Yes, please!', hasAttachment,
    previousAssistantId: 'assistant-preview-A', previewPhotoId: 'photo-A' })
}
function duplicateDb(itemNumber: string): SupabaseClient {
  const source = { id: 'prior-photo', session: { id: 'prior-intake', item_number: itemNumber, catalog_mode: 'item_number',
    metadata: { confirmedPhotoId: 'prior-photo', savedMainPhotoUrl: 'saved-main' }, created_listing_ids: ['listing-prior'] } }
  const chain: Record<string, unknown> = { data: [source], error: null }
  for (const key of ['select', 'eq']) chain[key] = () => chain
  const listings = { select: () => ({ in: async () => ({ data: [{ id: 'listing-prior', listing_photo_url: 'saved-main' }], error: null }) }) }
  return { from: (table: string) => table === 'trade_listings' ? listings : chain } as unknown as SupabaseClient
}
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal('React', React); updateSession.mockResolvedValue(undefined); processPhoto.mockResolvedValue({ photoUrl: 'saved-exact-photo-A' }) })

describe('main photo guards', () => {
  it('G1: labels alone are refused with a request for a jewelry photo', () => {
    const s = state(); s.photos[0].declaredRole = 'label_details'
    expect(() => requireConfirmedMainPhoto(s, 'RG12345', { selectedPhotoId: 'photo-A' })).toThrow(/jewelry photo/)
    s.photos[0].declaredRole = 'jewelry_front'; s.photos[0].visualRole = 'label_or_packaging'
    expect(() => requireConfirmedMainPhoto(s, 'RG12345', { selectedPhotoId: 'photo-A' })).toThrow(/jewelry photo/)
  })
  it('G2/G5: an index or id for a second piece is refused without choosing the first photo', () => {
    const s = state(); s.photos.push({ ...s.photos[0], id: 'photo-B', imageUrl: 'different-piece' })
    expect(() => requireConfirmedMainPhoto(s, 'RG12345', { modelIndex: 2 })).toThrow(/jewelry photo/)
    expect(() => requireConfirmedMainPhoto(s, 'RG12345', { selectedPhotoId: 'photo-B' })).toThrow(/jewelry photo/)
    expect(getCurrentPiecePhotos(s, 'RG99999')).toEqual([])
  })
  it('G2: no named photo means no last-accepted fallback', () => {
    expect(resolveWorkflowCustomerFacingPhoto(state().photos)).toBeNull()
    expect(resolveWorkflowCustomerFacingPhoto(state().photos, { selectedPhotoId: 'missing' })).toBeNull()
  })
  it('G3: a submitted yes after the persisted preview saves that exact photo', async () => {
    const s = state(); expect((await preview(s))?.photoId).toBe('photo-A'); yes(s)
    expect(s.metadata.confirmedPhotoId).toBe('photo-A')
    expect(await processListingPhotoForAdd({ itemNumber: 'rg12345', repId: s.repId, conversationId: s.conversationId, supabase: db, activeTradeBoardWorkflow: s })).toBe('saved-exact-photo-A')
    expect(processPhoto).toHaveBeenCalledWith(expect.objectContaining({ sourceImageUrl: url }), { confirmedJewelryFront: true })
  })
  it('G3: a new upload in place of yes clears confirmation and cannot save', async () => {
    const s = state(); await preview(s); yes(s); yes(s, true)
    expect(s.metadata.confirmedPhotoId).toBeUndefined()
    expect(() => requireConfirmedMainPhoto(s, 'RG12345', { selectedPhotoId: 'photo-A' })).toThrow(/confirm/)
    expect(processPhoto).not.toHaveBeenCalled()
  })
  it('G3: yes for piece A cannot confirm piece B', async () => {
    const s = state(); await preview(s); s.known.itemNumber = 'RG99999'; yes(s)
    expect(s.metadata.confirmedPhotoId).toBeUndefined()
    expect(() => requireConfirmedMainPhoto(s, 'RG99999', { selectedPhotoId: 'photo-A' })).toThrow(/jewelry photo/)
  })
  it('G4: identical bytes already used on another item are blocked before processing', async () => {
    await expect(assertMainPhotoNotReused(duplicateDb('ER88888'), state().photos[0], 'RG12345')).rejects.toThrow("This photo is already on ER88888. I won't use it as the main photo for RG12345.")
    expect(processPhoto).not.toHaveBeenCalled()
  })
  it('G4: identical bytes for the same item number and another finish are allowed', async () => {
    await expect(assertMainPhotoNotReused(duplicateDb('rg12345'), state().photos[0], 'RG12345')).resolves.toBe(hash)
  })
  it('G6: blurry photos cannot be previewed or saved', async () => {
    const s = state(); s.photos[0].notes = ['blur_risk']
    expect(await preview(s)).toBeNull(); expect(mainPhotoProblem(s)).toMatch(/blurry.*retake/)
    expect(() => requireConfirmedMainPhoto(s, 'RG12345', { selectedPhotoId: 'photo-A' })).toThrow(/blurry/)
  })
  it('G6: edge-cut photos cannot be previewed or saved', async () => {
    const s = state(); s.photos[0].qualityIssues = ['subject_cut_off']
    expect(await preview(s)).toBeNull(); expect(mainPhotoProblem(s)).toMatch(/cut off.*retake/)
    expect(() => requireConfirmedMainPhoto(s, 'RG12345', { selectedPhotoId: 'photo-A' })).toThrow(/cut off/)
  })
  it('a correct typed item number still saves when a separate label is unreadable', async () => {
    const s = state(); s.photos.push({ ...s.photos[0], id: 'label', declaredRole: 'label_details', quality: 'blocked', notes: [], imageUrl: 'unreadable-label' })
    expect(await preview(s)).not.toBeNull(); yes(s)
    expect(requireConfirmedMainPhoto(s, 'RG12345').id).toBe('photo-A')
  })
  it('a label printing another item number blocks preview and save', async () => {
    const s = state(); s.photos.push({ ...s.photos[0], id: 'label', declaredRole: 'label_details', notes: ['label_item_number:RG99999'] })
    expect(await preview(s)).toBeNull()
    expect(() => requireConfirmedMainPhoto(s, 'RG12345')).toThrow(/label shows RG99999/)
  })
  it('the preview renderer shows the image and the exact plain question', () => {
    const html = renderToStaticMarkup(createElement(MainPhotoPreview, { url, question: 'Is this the right main photo for RG12345?' }))
    expect(html).toContain(`<img src="${url}"`)
    expect(html).toContain('Is this the right main photo for RG12345?')
  })
  it('non-item-number confirmation is bound to its intake identity', async () => {
    const s = state(); s.catalogMode = 'non_item_number'; s.known = { jewelryType: 'ER', collectionFamily: 'Originals', rarityClassification: 'standard' }
    const key = workflowPieceKey(s); s.metadata.photoBindings = { 'photo-A': key }
    expect(key).toBe('NON_ITEM:intake-A'); await preview(s); yes(s)
    expect(requireConfirmedMainPhoto(s, key).id).toBe('photo-A')
    expect(() => requireConfirmedMainPhoto(s, 'NON_ITEM:intake-B')).toThrow(/jewelry photo/)
  })
})
