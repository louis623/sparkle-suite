import { describe, expect, it, vi } from 'vitest'
import { clearName, publishReceipt, readName, rememberName, restoreDraft, saveDraft } from '@/lib/amethyst/v2/swap-request-state.js'

const day = 86_400_000
function memory() {
  const data = new Map<string, string>()
  return { getItem: (k: string) => data.get(k), setItem: (k: string,v: string) => data.set(k,v), removeItem: (k: string) => data.delete(k) }
}

describe('remembered swap customer and tab-local draft', () => {
  it('stores only the trimmed name and save time, expires at 30 days, and clears immediately', () => {
    const storage = memory()
    expect(readName(storage, 10)).toBe('')
    rememberName(storage, '  Jessie ', 10)
    expect(JSON.parse(storage.getItem('sparkle-suite.swap-request.customer-name')!)).toEqual({name:'Jessie',savedAt:10})
    expect(readName(storage, 10 + 30 * day - 1)).toBe('Jessie')
    expect(readName(storage, 10 + 30 * day)).toBe('')
    rememberName(storage, 'Jessie')
    clearName(storage)
    expect(readName(storage)).toBe('')
  })
  it('ignores malformed, empty, future-dated and over-length saves', () => {
    const storage = memory()
    for (const value of [null, {name:'',savedAt:10}, {name:' '.repeat(3),savedAt:10}, {name:'x'.repeat(101),savedAt:10}, {name:'A',savedAt:11}]) {
      storage.setItem('sparkle-suite.swap-request.customer-name',JSON.stringify(value))
      expect(readName(storage,10)).toBe('')
    }
    expect(readName({getItem: () => { throw new Error('blocked') }})).toBe('')
  })
  it('publishes the matched receipt before attempting either blocked storage or analytics', () => {
    const events: string[] = []
    const payload = {listingId:'dancer',customerName:'Jessie'}
    const receipt = {listingId:'dancer',requestId:'ace11111-1111-4111-8111-111111111111',receiptUrl:'/trade-request/status/'+'a'.repeat(64)}
    const publish = vi.fn(() => events.push('receipt'))
    publishReceipt(receipt,payload,publish,{setItem: () => { events.push('storage'); throw Error() }},() => { events.push('analytics'); throw Error() })
    expect(publish).toHaveBeenCalledWith(receipt)
    expect(events).toEqual(['receipt','storage','analytics'])
    expect(() => publishReceipt({...receipt,listingId:'different'},payload,publish,null)).toThrow()
    expect(publish).toHaveBeenCalledTimes(1)
  })
  it('recovers only this shop’s exact frozen submission within its two-hour window', () => {
    const storage = memory()
    const listingId = 'ace11111-1111-4111-8111-111111111111'
    const submissionId = 'ace22222-2222-4222-8222-222222222222'
    const attempt = {listingId,submissionId,customerName:'Jessie',customerDescription:'',offeredType:null,offeredFamily:null,manualReviewRequested:false,uploadId:null}
    const draft = {listingId,submissionId,name:'Jessie',type:'',family:'',step:2,attempt,savedAt:100}
    saveDraft(storage,'shop-A',draft)
    expect(restoreDraft(storage,'shop-A',101)?.attempt).toEqual(attempt)
    expect(restoreDraft(storage,'shop-B',101)).toBeNull()
    expect(restoreDraft(storage,'shop-A',100 + 7_200_000)).toBeNull()
    saveDraft(storage,'shop-A',{...draft,attempt:{...attempt,listingId:submissionId}})
    expect(restoreDraft(storage,'shop-A',101)).toBeNull()
    saveDraft(storage,'shop-A',null)
    expect(restoreDraft(storage,'shop-A',101)).toBeNull()
  })
})
