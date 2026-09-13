import {describe,it,expect,vi} from 'vitest'
import {assertReviewerSmokeRep, assertReviewerSmokeSubscription, reservedReviewerSetupSlug, REVIEWER_SMOKE_SCOPE} from '@/lib/reviewer-smoke/identity'
const email='sparkle-reviewer+preview@neonrabbit.net'
const user={id:'auth',email,app_metadata:{reviewer_smoke_scope:REVIEWER_SMOKE_SCOPE}}
const rep={id:'rep',auth_user_id:'auth',email,account_classification:'demo',finder_directory_visible:false,custom_domain:null,public_site_slug:null}
describe('isolated reviewer authority',()=>{
  it.each([
    {email:'customer@example.com'}, {auth_user_id:'other'}, {account_classification:'customer'},
    {finder_directory_visible:true},{custom_domain:'customer.example.com'},{public_site_slug:'customer-site'},
  ])('rejects non-isolated workspace %j',patch=>expect(()=>assertReviewerSmokeRep({...rep,...patch},user,email)).toThrow())
  it('accepts only email-matched reserved synthetic slug',()=>{
    expect(()=>assertReviewerSmokeRep({...rep,public_site_slug:'sparkle-reviewer-preview'},user,email)).not.toThrow()
    expect(()=>assertReviewerSmokeRep({...rep,public_site_slug:'sparkle-reviewer-local'},user,email)).toThrow()
  })
  it('normalizes only proven old synthetic entitlement amounts',()=>{
    const row={rep_id:'rep',stripe_subscription_id:'sub_reviewer_smoke_rep',stripe_customer_id:'cus_reviewer_smoke_rep',stripe_livemode:false,pricing_tier:'smoke',monthly_amount:99}
    expect(()=>assertReviewerSmokeSubscription(row,'rep')).not.toThrow()
    for(const patch of [{monthly_amount:1},{stripe_livemode:true},{stripe_customer_id:'cus_real'},{rep_id:'other'}]) expect(()=>assertReviewerSmokeSubscription({...row,...patch},'rep')).toThrow()
  })
  it('preserves ordinary setup behavior and never loads customer auth',async()=>{
    const getUserById=vi.fn();const q={select:vi.fn(),eq:vi.fn(),in:vi.fn(),maybeSingle:async()=>({data:null,error:null})}
    for(const key of ['select','eq','in'] as const)q[key].mockReturnValue(q)
    const admin={from:()=>q,auth:{admin:{getUserById}}}
    expect(await reservedReviewerSetupSlug(admin as never,'customer')).toBeNull();expect(getUserById).not.toHaveBeenCalled()
  })
  it('pins reviewer setup to the reserved slug using server-owned auth scope',async()=>{
    const getUserById=vi.fn().mockResolvedValue({data:{user},error:null});const q={select:vi.fn(),eq:vi.fn(),in:vi.fn(),maybeSingle:async()=>({data:rep,error:null})}
    for(const key of ['select','eq','in'] as const)q[key].mockReturnValue(q)
    const admin={from:()=>q,auth:{admin:{getUserById}}}
    expect(await reservedReviewerSetupSlug(admin as never,'rep')).toBe('sparkle-reviewer-preview')
    getUserById.mockResolvedValue({data:{user:{...user,app_metadata:{},user_metadata:{reviewer_smoke_scope:REVIEWER_SMOKE_SCOPE}}},error:null})
    await expect(reservedReviewerSetupSlug(admin as never,'rep')).rejects.toMatchObject({code:'REVIEWER_SMOKE_IDENTITY_MIGRATION_REQUIRED'})
  })
})
