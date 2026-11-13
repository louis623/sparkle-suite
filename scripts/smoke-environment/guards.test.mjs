import test from 'node:test';
import assert from 'node:assert/strict';
import { TARGETS, assertEnvironment, assertDeployment, assertCronDisabled } from './guards.mjs';
const jwt = (ref,role) => `header.${Buffer.from(JSON.stringify({ref,role})).toString('base64url')}.signature`;
function fixture(product) {
 const t=TARGETS[product];
 return {SPARKLE_ENVIRONMENT:'smoke',NEXT_PUBLIC_SPARKLE_ENVIRONMENT:'smoke',NEXT_PUBLIC_SUPABASE_URL:`https://${t.ref}.supabase.co`,SUPABASE_SERVICE_ROLE_KEY:jwt(t.ref,'service_role'),[product==='suite'?'NEXT_PUBLIC_SUPABASE_ANON_KEY':'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']:jwt(t.ref,'anon'),[product==='suite'?'NEXT_PUBLIC_APP_URL':'NEXT_PUBLIC_SITE_URL']:t.origin,SPARKLE_SELF_SERVE_ENABLED:'false',SPARKLE_PRE_SHOW_SMS_ENABLED:'false',SPARKLE_PRE_SHOW_EMAIL_ENABLED:'false',SIGNWELL_SEND_ENABLED:'false',SPARKLE_LAB_MANUAL_RUNS_ENABLED:'false',SPARKLE_LAB_WEEKLY_RUNS_ENABLED:'false',SPARKLE_LAB_MODEL_SYNTHESIS_ENABLED:'false',SPARKLE_FINDER_ENABLE_PAID_BILLING:'false',SPARKLE_SUITE_FINDER_API_BASE_URL:TARGETS.suite.origin,NEXT_PUBLIC_SPARKLE_SUITE_FINDER_API_BASE_URL:TARGETS.suite.origin};
}
test('staging configurations pass; cross-product and production credentials fail',()=>{
 for(const p of ['suite','finder']) {
  assert.doesNotThrow(()=>assertEnvironment(p,fixture(p)));
  assert.throws(()=>assertEnvironment(p,{...fixture(p),NEXT_PUBLIC_SUPABASE_URL:'https://bqhzfkgkjyuhlsozpylf.supabase.co'}));
  assert.throws(()=>assertEnvironment(p,{...fixture(p),SUPABASE_SERVICE_ROLE_KEY:jwt('bqhzfkgkjyuhlsozpylf','service_role')}));
  assert.throws(()=>assertEnvironment(p,{...fixture(p),STRIPE_SECRET_KEY:'sk_live_example'}));
 }
 assert.throws(()=>assertEnvironment('finder',{...fixture('finder'),SPARKLE_SUITE_FINDER_API_BASE_URL:'https://www.yoursparklesuite.com'}));
 assert.throws(()=>assertEnvironment('suite',{...fixture('suite'),SPARKLE_PRE_SHOW_SMS_ENABLED:'true'}));
});
test('source and project fences prevent wrong alias promotion',()=>{
 const sha='a'.repeat(40),d={projectId:TARGETS.finder.project,readyState:'READY',meta:{githubCommitSha:sha},target:null};
 assert.doesNotThrow(()=>assertDeployment('finder',d,sha));
 for(const bad of [{...d,projectId:'production-project'},{...d,target:'production'},{...d,readyState:'BUILDING'},{...d,meta:{githubCommitSha:'b'.repeat(40)}}]) assert.throws(()=>assertDeployment('finder',bad,sha));
});
test('cron definitions are not a substitute for disabled Suite scheduler',()=>{
 const base={id:TARGETS.suite.project,crons:{enabledAt:1,disabledAt:2}};
 assert.doesNotThrow(()=>assertCronDisabled('suite',base));
 assert.throws(()=>assertCronDisabled('suite',{...base,crons:{enabledAt:3,disabledAt:2,definitions:[]}}));
});
