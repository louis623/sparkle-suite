import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { dbFixture, dancer, repId, listingId } from '../helpers/dance-floor-fixture'
const s=vi.hoisted(()=>({admin:null as any,audit:vi.fn(),resolve:vi.fn()}))
vi.mock('@/lib/supabase/admin',()=>({createAdminClient:()=>s.admin}))
vi.mock('@/lib/nic-nac/audit',()=>({writeTradeActionAudit:s.audit}))
vi.mock('@/lib/nic-nac/guardian-telemetry',()=>({logIncident:vi.fn()}))
vi.mock('@/lib/services/jewelry-database',async original=>({...await original<any>(),resolveItemNumber:s.resolve}))
import { makeRemoveListingTool } from '@/lib/nic-nac/tools/remove-listing'
import { makeRestoreListingTool } from '@/lib/nic-nac/tools/restore-listing'
import { approveTrade } from '@/lib/services/trade-requests'
import { approveTradeWithRevealedItemCapture } from '@/lib/services/trade-swaps'
const verification={verifiedOfferedFamily:'Birthday',verifiedOfferedType:'RG' as const,verificationConfirmed:true,finalConfirmation:true}
beforeEach(()=>{vi.clearAllMocks();s.admin={rpc:vi.fn()};s.audit.mockResolvedValue(undefined);s.resolve.mockResolvedValue({found:true,hasCollection:true,design:{id:'design',collectionName:'Birthday',typePrefix:'RG'}})})
describe('chat compatibility and approval error mapping',()=>{
 it('Remove uses the user client for ownership, privileged RPC, one audit, all cancellations and legacy fields',async()=>{
  const user=dbFixture({trade_listings:[dancer()],trade_requests:[{id:'r1',listing_id:listingId,customer_name:'One'},{id:'r2',listing_id:listingId,customer_name:'Two'}]})
  s.admin.rpc.mockResolvedValue({data:{cancelled_request_ids:['r1','r2'],cancelled_count:2},error:null})
  const tool=makeRemoveListingTool({repId,supabase:user.client,conversationId:'chat',runId:'run'})
  const result=await (tool.execute as any)({listingId,reason:'other'})
  expect(user.client.rpc).not.toHaveBeenCalled();expect(s.admin.rpc).toHaveBeenCalledWith('rpc_remove_trade_listing_v1',{p_rep_id:repId,p_listing_id:listingId,p_reason:'other'})
  expect(result.cancelledCount).toBe(2);expect(result.cancelledRequests).toHaveLength(2);expect(result.cancelledRequest.requestId).toBe('r1')
  expect(s.audit).toHaveBeenCalledTimes(1);expect(s.audit.mock.calls[0][0].details.cancelledCount).toBe(2)
 })
 it('Restore keeps its signature and one audit while calling the admin RPC',async()=>{
  const user=dbFixture({trade_listings:[dancer({status:'removed',deleted_at:new Date().toISOString()})]})
  s.admin.rpc.mockResolvedValue({data:{status:'available'},error:null})
  const tool=makeRestoreListingTool({repId,supabase:user.client,conversationId:'chat',runId:'run'})
  const result=await (tool.execute as any)({listingId})
  expect(result.status).toBe('available');expect(user.client.rpc).not.toHaveBeenCalled()
  expect(s.admin.rpc).toHaveBeenCalledWith('rpc_restore_trade_listing_v1',{p_rep_id:repId,p_listing_id:listingId,p_recovery_days:7});expect(s.audit).toHaveBeenCalledTimes(1)
 })
 it.each(['OPEN_SWAP','LISTING_NOT_ACTIVE'])('maps %s to plain chat copy without auditing failure',async code=>{
  const user=dbFixture({trade_listings:[dancer()]});s.admin.rpc.mockResolvedValue({data:null,error:{message:code}})
  const tool=makeRemoveListingTool({repId,supabase:user.client,conversationId:'chat',runId:'run'})
  const error=await (tool.execute as any)({listingId,reason:'other'}).catch((e:any)=>e)
  expect(error.code).toBe(code);expect(error.userMessage).not.toBe(code);expect(s.audit).not.toHaveBeenCalled()
 })
 it('U15 preserves both existing approval paths: mapped direct error and untouched swap propagation',async()=>{
  const user=dbFixture({trade_requests:[{id:'r',status:'pending',listing:{rep_id:repId,design:{type_prefix:'RG',collection:{name:'Birthday'}}}}]})
  const raw={message:'LISTING_NOT_FOUND',code:'P0001'};user.client.rpc.mockResolvedValue({data:null,error:raw})
  await expect(approveTrade(user.client,repId,'r',undefined,verification)).rejects.toMatchObject({code:'LISTING_NOT_FOUND'})
  await expect(approveTradeWithRevealedItemCapture(user.client,repId,{requestId:'r',revealedItemNumber:'RG100',verification})).rejects.toBe(raw)
  expect(readFileSync('lib/services/trade-swaps.ts','utf8')).toContain('Added from approved dancer swap for ${approved.customerName}.')
 })
})
