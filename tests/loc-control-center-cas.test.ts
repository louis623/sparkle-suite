import { beforeEach,describe,expect,it,vi } from 'vitest'
const mocks=vi.hoisted(()=>({from:vi.fn()}))
vi.mock('@/lib/supabase/admin',()=>({createAdminClient:()=>({from:mocks.from})}))
vi.mock('@/lib/supabase/operator-auth',()=>({getControlCenterAccess:async()=>({operator:{repId:'owner'},scope:'owner'}),AuthError:class extends Error{},OperatorAuthError:class extends Error{}}))
import { upsertPrelaunchLaunchSetupProfile,PrelaunchSetupProfileConflictError } from '@/lib/prelaunch/setup-profiles'
import { PATCH,DELETE } from '@/app/api/control-center/customer-waitlist/route'
beforeEach(()=>mocks.from.mockReset())
describe('LOC source revision checks',()=>{
 it('rejects stale setup-profile updates before touching build readiness',async()=>{
  const filters:Record<string,unknown>={};const update=vi.fn(()=>query)
  const query={update,eq:(key:string,value:unknown)=>{filters[key]=value;return query},select:()=>query,single:async()=>({data:null,error:{code:'PGRST116'}})}
  mocks.from.mockReturnValue(query)
  await expect(upsertPrelaunchLaunchSetupProfile({launchBuildId:'build',businessName:'Safe reviewer',expectedUpdatedAt:'2026-09-08T00:00:00Z'})).rejects.toBeInstanceOf(PrelaunchSetupProfileConflictError)
  expect(filters).toEqual({launch_build_id:'build',updated_at:'2026-09-08T00:00:00Z'})
  expect(mocks.from).toHaveBeenCalledTimes(1)
 })
 it('uses insert-only for a previously absent profile and rejects a racing creation',async()=>{
  const insert=vi.fn(()=>query),upsert=vi.fn()
  const query={insert,upsert,select:()=>query,single:async()=>({data:null,error:{code:'23505'}})}
  mocks.from.mockReturnValue(query)
  await expect(upsertPrelaunchLaunchSetupProfile({launchBuildId:'build',businessName:'Safe reviewer',expectedUpdatedAt:null})).rejects.toBeInstanceOf(PrelaunchSetupProfileConflictError)
  expect(insert).toHaveBeenCalledTimes(1);expect(upsert).not.toHaveBeenCalled()
 })
 it('returns409 for waitlist notes after another center edits the source',async()=>{
  const filters:Record<string,unknown>={};const query={update:()=>query,eq:(key:string,value:unknown)=>{filters[key]=value;return query},select:()=>query,single:async()=>({data:null,error:{code:'PGRST116'}})}
  mocks.from.mockReturnValue(query)
  const response=await PATCH(new Request('https://example.com',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id:'lead',notes:'Stale edit',expectedUpdatedAt:'2026-09-08T00:00:00Z'})}))
  expect(response.status).toBe(409);expect(filters).toEqual({id:'lead',updated_at:'2026-09-08T00:00:00Z'})
 })
 it('does not delete a waitlist record changed since it was reviewed',async()=>{
  const read={select:()=>read,eq:()=>read,maybeSingle:async()=>({data:{id:'lead',name:'Safe reviewer'},error:null})}
  const filters:Record<string,unknown>={};const deletion={delete:()=>deletion,eq:(key:string,value:unknown)=>{filters[key]=value;return deletion},select:()=>deletion,maybeSingle:async()=>({data:null,error:null})}
  mocks.from.mockReturnValueOnce(read).mockReturnValueOnce(deletion)
  const response=await DELETE(new Request('https://example.com',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({id:'lead',expectedUpdatedAt:'2026-09-08T00:00:00Z'})}))
  expect(response.status).toBe(409);expect(filters).toEqual({id:'lead',updated_at:'2026-09-08T00:00:00Z'})
 })
})
