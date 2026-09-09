import {beforeEach,expect,it,vi} from 'vitest';
const handler=vi.hoisted(()=>vi.fn(async()=>Response.json({ok:true})));
vi.mock('@/app/api/control-center/intake/agreement-document/route',()=>({POST:handler}));
import {runExistingLocRoute} from '@/lib/loc-control-center/legacy-routes';
import {LocPreconditionError} from '@/lib/loc-control-center/security';
beforeEach(()=>{handler.mockClear();vi.stubEnv('SIGNWELL_API_KEY','');vi.stubEnv('SIGNWELL_API_BASE_URL','');vi.stubEnv('SIGNWELL_TEMPLATE_ID','');});
it('explains missing agreement configuration before touching the handler',async()=>{
 await expect(runExistingLocRoute('onboarding.agreement-document',{product:'suite',launchBuildId:'00000000-0000-4000-8000-000000000001'})).rejects.toBeInstanceOf(LocPreconditionError);
 expect(handler).not.toHaveBeenCalled();
});
it('retains the original handler when configuration exists',async()=>{
 vi.stubEnv('SIGNWELL_API_KEY','synthetic-key');vi.stubEnv('SIGNWELL_API_BASE_URL','https://example.test');vi.stubEnv('SIGNWELL_TEMPLATE_ID','synthetic-template');
 await expect(runExistingLocRoute('onboarding.agreement-document',{product:'suite',launchBuildId:'00000000-0000-4000-8000-000000000001'})).resolves.toEqual({ok:true});expect(handler).toHaveBeenCalledOnce();
});
