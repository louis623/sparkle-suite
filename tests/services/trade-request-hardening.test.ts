import { describe, expect, it, vi } from 'vitest'
import { normalizeTradeFamily, screenTradeOffer } from '@/lib/services/trade-request-matcher'
import { getTradeRequestReceiptStatus, approveTrade, rejectTrade, getRequestedTradeFacts } from '@/lib/services/trade-requests'

describe('deterministic trade family and type rule', () => {
  it('matches Birthday across months and years', () => {
    expect(screenTradeOffer('July Birthday 2026', 'ring', 'December Birthday 2025', 'RG').status).toBe('likely_match')
  })

  it('keeps OG, named collections, and jewelry types distinct', () => {
    expect(screenTradeOffer('Birthday', 'RG', 'OG', 'RG').status).toBe('mismatch')
    expect(screenTradeOffer('Birthday', 'RG', 'Birthday', 'NK').status).toBe('mismatch')
    expect(screenTradeOffer('Woodland Wishes', 'BR', ' woodland   wishes ', 'BR').status).toBe('likely_match')
    expect(screenTradeOffer("Firefly's Glow", 'BR', " firefly's   glow ", 'BR').status).toBe('likely_match')
    expect(screenTradeOffer('Woodland Wishes', 'BR', 'Garden Party', 'BR').status).toBe('mismatch')
    expect(normalizeTradeFamily('not sure')).toBeNull()
  })
})

function requestClient(overrides:Record<string,unknown>={},status='pending',owner='rep-1') {
 const row={id:'request-1',status,listing:{rep_id:owner,manual_collection_family:null,manual_type_prefix:null,design:{type_prefix:'NK',collection:{name:'Lustre'}},...overrides}}
 const maybeSingle=vi.fn().mockResolvedValue({data:row,error:null})
 const eq=vi.fn(()=>({maybeSingle})),select=vi.fn(()=>({eq})),from=vi.fn(()=>({select}))
 const rpc=vi.fn().mockResolvedValue({data:{request_id:'request-1',listing_id:'listing-1',fulfillment_id:'ful-1',customer_name:'Test',listing_restored:true},error:null})
 return {client:{from,rpc} as never,rpc,maybeSingle}
}
describe('server decision boundary',()=>{
 it('derives requested facts and ignores contradictory legacy client verification',async()=>{
  const {client,rpc}=requestClient()
  await approveTrade(client,'rep-1','request-1','private',{verifiedOfferedFamily:'OG',verifiedOfferedType:'RG',verificationConfirmed:false,finalConfirmation:false})
  expect(rpc).toHaveBeenCalledWith('rpc_approve_trade_v2',{p_request_id:'request-1',p_rep_id:'rep-1',p_verified_family:'Lustre',p_verified_type:'NK',p_verification_confirmed:true,p_final_confirmation:true,p_rep_notes:'private'})
 })
 it.each([{manual_collection_family:''},{manual_collection_family:'not sure'},{manual_type_prefix:''},{design:null}])('refuses absent or empty raw facts without display defaults: %j',async override=>{
  const {client,rpc}=requestClient(override)
  await expect(approveTrade(client,'rep-1','request-1')).rejects.toMatchObject({code:'REQUESTED_ITEM_UNVERIFIED'})
  expect(rpc).not.toHaveBeenCalled()
 })
 it('uses manual nullish-coalesce values before catalog and supports array relations',async()=>{
  const {client,maybeSingle}=requestClient({manual_collection_family:'July Birthday 2026',manual_type_prefix:'RG'})
  expect(await getRequestedTradeFacts(client,'rep-1','request-1')).toEqual({family:'July Birthday 2026',type:'RG'})
  maybeSingle.mockResolvedValueOnce({data:{listing:[{rep_id:'rep-1',manual_collection_family:null,manual_type_prefix:null,design:[{type_prefix:'ER',collection:[{name:'OG'}]}]}]},error:null})
  expect(await getRequestedTradeFacts(client,'rep-1','request-1')).toEqual({family:'OG',type:'ER'})
 })
 it.each([['pending','foreign','UNAUTHORIZED'],['denied','rep-1','REQUEST_NOT_PENDING']])('ownership/status %s %s blocks both decisions',async(status,owner,code)=>{
  const {client,rpc}=requestClient({},status,owner)
  await expect(approveTrade(client,'rep-1','request-1')).rejects.toMatchObject({code})
  await expect(rejectTrade(client,'rep-1','request-1')).rejects.toMatchObject({code})
  expect(rpc).not.toHaveBeenCalled()
 })
 it.each([undefined,'','  '])('blank denial gets other and exactly one default: %s',async message=>{
  const {client,rpc}=requestClient();await rejectTrade(client,'rep-1','request-1',undefined,'private',message)
  expect(rpc).toHaveBeenCalledWith('rpc_reject_trade_v2',expect.objectContaining({p_reason:'other',p_customer_explanation:'Your rep could not approve this swap.',p_rep_notes:'private'}))
 })
 it('cleans controls, preserves plain text, and refuses overlong messages before writing',async()=>{
  const {client,rpc}=requestClient();await rejectTrade(client,'rep-1','request-1','other',undefined,'  <b>No</b>\nthanks\u0000  ')
  expect(rpc).toHaveBeenCalledWith('rpc_reject_trade_v2',expect.objectContaining({p_customer_explanation:'<b>No</b> thanks'}))
  rpc.mockClear();await expect(rejectTrade(client,'rep-1','request-1','other',undefined,'a'.repeat(241))).rejects.toMatchObject({code:'INVALID_INPUT'});expect(rpc).not.toHaveBeenCalled()
 })
})

describe('private status lookup', () => {
  it('rejects malformed tokens without querying and returns no personal fields', async () => {
    const from = vi.fn()
    expect(await getTradeRequestReceiptStatus({ from } as never, 'request-uuid')).toBeNull()
    expect(from).not.toHaveBeenCalled()

    const maybeSingle = vi.fn().mockResolvedValue({ data: {
      status: 'denied', rejection_reason: 'other', denial_explanation: 'That dancer is unavailable.',
      updated_at: '2026-09-23T12:00:00Z', customer_name: 'Private customer', rep_notes: 'Private note',
    }, error: null })
    const eq = vi.fn(() => ({ maybeSingle }))
    const select = vi.fn(() => ({ eq }))
    from.mockReturnValue({ select })
    const result = await getTradeRequestReceiptStatus({ from } as never, 'a'.repeat(64))
    expect(result).toEqual({ status: 'denied', denialExplanation: 'That dancer is unavailable.', updatedAt: '2026-09-23T12:00:00Z' })
    expect(JSON.stringify(result)).not.toContain('Private')
    expect(select).toHaveBeenCalledWith('status, rejection_reason, denial_explanation, updated_at')
  })
})
