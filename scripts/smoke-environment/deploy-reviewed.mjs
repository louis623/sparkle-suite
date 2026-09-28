import {readFileSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {TEAM,TARGETS,assertEnvironment,assertCronDisabled,assertDeployment} from './guards.mjs';
const input=JSON.parse(readFileSync(0,'utf8'));
const token=input.token,sha=input.sha;
if(typeof token!=='string'||!token||!/^[a-f0-9]{40}$/.test(sha))throw Error('Authenticated token and full verified SHA required');
const target=TARGETS.suite;
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
execFileSync(process.execPath,['scripts/check-active-branch.mjs','--operation','smoke-deploy'],{stdio:'inherit'});
if(git('rev-parse','HEAD')!==sha||git('branch','--show-current')!=='codex/nic-nac-trade-hardening'
 ||git('remote','get-url','origin')!=='https://github.com/louis623/sparkle-suite.git'
 ||git('status','--porcelain'))throw Error('Deploy only the clean verified active branch tip');
async function get(path){
 const res=await fetch('https://api.vercel.com'+path+(path.includes('?')?'&':'?')+'teamId='+TEAM,{headers:{Authorization:'Bearer '+token}});
 if(!res.ok)throw Error('Vercel read failed: '+res.status);
 return res.json();
}
const project=await get('/v9/projects/'+target.project);assertCronDisabled('suite',project);
const {envs}=await get('/v10/projects/'+target.project+'/env');
const decrypted=await Promise.all(envs.map(async e=>{const detail=await get('/v1/projects/'+target.project+'/env/'+e.id);if(!detail.decrypted)throw Error('Environment cannot be verified');return {...e,value:detail.value};}));
for(const scope of ['preview','production'])assertEnvironment('suite',Object.fromEntries(decrypted.filter(e=>e.target.includes(scope)).map(e=>[e.key,e.value])));
const previous=await get('/v4/aliases/'+new URL(target.origin).hostname);
console.log(JSON.stringify({phase:'verified',project:target.project,sourceSha:sha,previousDeployment:previous.deploymentId??previous.deployment?.id,alias:target.origin,productionCustomerAliases:[]}));
const args=['--yes','vercel','deploy','--prod','--yes','--local-config','scripts/smoke-environment/vercel.json','--token',token,
 '--meta','githubCommitSha='+sha,'--meta','githubCommitRef=codex/nic-nac-trade-hardening',
 '--build-env','SPARKLE_RELEASE_BRANCH=codex/nic-nac-trade-hardening',
 '--build-env','SPARKLE_RELEASE_REPOSITORY=louis623/sparkle-suite'];
const result=spawnSync('npx',args,{env:{...process.env,VERCEL_ORG_ID:TEAM,VERCEL_PROJECT_ID:target.project},encoding:'utf8',maxBuffer:8*1024*1024});
for(const output of [result.stdout,result.stderr])if(output)process.stdout.write(output.split(token).join('[redacted]'));
if(result.status!==0)throw Error('Smoke deployment failed: '+result.status);
const alias=await get('/v4/aliases/'+new URL(target.origin).hostname);
const id=alias.deploymentId??alias.deployment?.id;
const deployment=await get('/v13/deployments/'+id);assertDeployment('suite',deployment,sha);
assertCronDisabled('suite',await get('/v9/projects/'+target.project));
console.log(JSON.stringify({phase:'deployed',deploymentId:id,url:deployment.url,sourceSha:sha,alias:target.origin}));
