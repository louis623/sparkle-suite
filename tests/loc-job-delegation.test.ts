import { test } from 'vitest';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { locJobDelegationSchema, verifyLocJobDelegation } from '@/lib/loc-control-center/job-delegation';
import { digestLocInput } from '@/lib/loc-control-center/security';
const now = Date.now();
function fixture() {
  const ownerId=randomUUID(), connectionId=randomUUID(), operationId=randomUUID();
  const operation='resources.publish', input={product:'suite',id:randomUUID(),title:'Approved exact draft',announce:false};
  const delegation={mode:'owner-approved' as const,ownerId,connectionId,operationId,jobId:randomUUID(),agentId:randomUUID(),operation:'suite.resources.publish',inputHash:'a'.repeat(64),bridgeInputHash:digestLocInput({operation,input}),targetIds:[input.id],expiresAt:new Date(now+3600000).toISOString()};
  return {authority:'agent' as 'owner'|'agent',ownerId,connectionId,operationId,operation,input,delegation};
}
test('accepts exact signed-envelope binding while retaining agent authority',()=>{
 const b=fixture();b.delegation=locJobDelegationSchema.parse(b.delegation);assert.equal(verifyLocJobDelegation(b,['id'],now),true);assert.equal(b.authority,'agent');
});
test('missing delegated approval grants no extra access',()=>{
 const {delegation,...body}=fixture();assert.equal(verifyLocJobDelegation(body,['id'],now),false);
});
const mutations: Record<string,(body:ReturnType<typeof fixture>)=>void> = {
 'other owner':b=>{b.ownerId=randomUUID()},
 'other connection':b=>{b.connectionId=randomUUID()},
 'other operation ID':b=>{b.operationId=randomUUID()},
 'other workflow':b=>{b.operation='communications.publish'},
 'other product':b=>{b.input.product='finder'},
 'changed publication input':b=>{b.input.announce=true},
 'changed draft':b=>{b.input.title='Unapproved replacement'},
 'changed target':b=>{b.input.id=randomUUID()},
 'extra target':b=>{b.delegation.targetIds.push(randomUUID())},
 'missing target':b=>{b.delegation.targetIds=[]},
 'expired approval':b=>{b.delegation.expiresAt=new Date(now).toISOString()},
 'unbounded expiry':b=>{b.delegation.expiresAt=new Date(now+31*86400000).toISOString()},
 'owner impersonation':b=>{b.authority='owner'},
};
for(const [name,mutate] of Object.entries(mutations)) test(`rejects ${name}`,()=>{
 const b=fixture();mutate(b);assert.throws(()=>verifyLocJobDelegation(b,['id'],now),/valid approval/);
});
test('malformed proof and self-issued approval flags are rejected by strict schema',()=>{
 const b=fixture();assert.equal(locJobDelegationSchema.safeParse({...b.delegation,approved:true}).success,false);
 assert.equal(locJobDelegationSchema.safeParse({...b.delegation,connectionId:'loc-owner'}).success,false);
 assert.equal(locJobDelegationSchema.safeParse({...b.delegation,expiresAt:'not-a-date'}).success,false);
});
