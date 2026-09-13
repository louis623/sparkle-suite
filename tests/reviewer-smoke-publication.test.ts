import {describe,it,expect,vi} from 'vitest'
import {publishRequiredSetupCustomerSiteDraft} from '@/lib/self-serve/required-setup-site-draft'
import {assertReviewerSmokeRep, REVIEWER_SMOKE_SCOPE} from '@/lib/reviewer-smoke/identity'

const email='sparkle-reviewer+preview@neonrabbit.net'
const user={id:'auth',email,app_metadata:{reviewer_smoke_scope:REVIEWER_SMOKE_SCOPE}}
const reviewer={id:'rep',auth_user_id:'auth',email,account_classification:'demo',finder_directory_visible:false,custom_domain:null,public_site_slug:'sparkle-reviewer-preview'}
function fixture(rep:unknown=reviewer,authUser:unknown=user){
  const read={select:vi.fn(),eq:vi.fn(),in:vi.fn(),maybeSingle:vi.fn().mockResolvedValue({data:rep,error:null})}
  for(const key of ['select','eq','in'] as const)read[key].mockReturnValue(read)
  const repUpdate=vi.fn(()=>({eq:vi.fn().mockResolvedValue({error:null})})),siteUpsert=vi.fn().mockResolvedValue({error:null})
  const getUserById=vi.fn().mockResolvedValue({data:{user:authUser},error:null})
  return {repUpdate,siteUpsert,getUserById,admin:{auth:{admin:{getUserById}},from:(table:string)=>table==='reps'?{...read,update:repUpdate}:{upsert:siteUpsert}}}
}
const state={repId:'rep',answers:{account_basics:{bestContactEmail:'synthetic-contact@example.com',liveShowName:'Synthetic Show'}},generatedCopy:{}}
describe('required setup reviewer publication identity',()=>{
  it('keeps trusted reviewer identity resettable after publishing a different synthetic contact answer',async()=>{
    const f=fixture()
    await publishRequiredSetupCustomerSiteDraft(f.admin,state as never)
    expect(f.repUpdate).not.toHaveBeenCalled() // This fixture has no other profile changes.
    expect(f.siteUpsert).toHaveBeenCalledWith(expect.objectContaining({rep_id:'rep',team_name:'Synthetic Show'}),{onConflict:'rep_id'})
    expect(()=>assertReviewerSmokeRep(reviewer,user,email)).not.toThrow()
    expect(f.getUserById).toHaveBeenCalledWith('auth')
  })
  it('retains ordinary customer contact-email publication and avoids customer auth lookups',async()=>{
    const f=fixture(null)
    await publishRequiredSetupCustomerSiteDraft(f.admin,state as never)
    expect(f.repUpdate).toHaveBeenCalledWith({email:'synthetic-contact@example.com'})
    expect(f.getUserById).not.toHaveBeenCalled()
  })
  it.each([
    {rep:{...reviewer,id:'other'}}, {rep:{...reviewer,auth_user_id:'wrong'}},
    {rep:{...reviewer,custom_domain:'customer.example.com'}}, {rep:{...reviewer,public_site_slug:'customer'}},
    {rep:{...reviewer,account_classification:'customer'}}, {rep:{...reviewer,finder_directory_visible:true}},
    {authUser:{...user,app_metadata:{},user_metadata:{reviewer_smoke_scope:REVIEWER_SMOKE_SCOPE}}},
  ])('rejects ambiguous or untrusted reviewer identities before all site writes %#',async patch=>{
    const f=fixture(patch.rep??reviewer,patch.authUser??user)
    await expect(publishRequiredSetupCustomerSiteDraft(f.admin,state as never)).rejects.toThrow()
    expect(f.repUpdate).not.toHaveBeenCalled();expect(f.siteUpsert).not.toHaveBeenCalled()
  })
})
