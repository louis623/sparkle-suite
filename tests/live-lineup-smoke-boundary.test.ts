import {expect,it} from 'vitest'
import {assertDeployment} from '../scripts/smoke-environment/guards.mjs'
import {execFileSync} from 'node:child_process'

it('accepts only the exact Smoke project and verified source for a Smoke release',()=>{
 const sha='a'.repeat(40), deployment={projectId:'prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ',readyState:'READY',meta:{githubCommitSha:sha}};
 expect(()=>assertDeployment('suite',deployment,sha)).not.toThrow();
 for(const projectId of [undefined,'prj_zCKmYDx1Sbs9hA1Lokzdv9Qm0TM3','prj_PvqPYv0R3DclFbFmM6vVNX2Q50gl'])expect(()=>assertDeployment('suite',{...deployment,projectId},sha)).toThrow();
 expect(()=>assertDeployment('suite',deployment,'b'.repeat(40))).toThrow();
})

it('packages deterministic Smoke identity, endpoint, isolated storage, warning and exact inventory',()=>{
 const script = `import assert from 'node:assert/strict'; import {buildSmokeSources,verifySmokeSources} from './scripts/smoke-environment/package-extension.mjs';
 const sources=buildSmokeSources(),result=verifySmokeSources(sources);assert.equal(result.manifestVersion,'2.0.6');
 const manifest=JSON.parse(sources.get('manifest.json'));assert.deepEqual(manifest.host_permissions,['https://myoffice.bombparty.com/*','https://sparkle-suite-smoke.vercel.app/*']);
 const worker=sources.get('background.js').toString();assert.ok(worker.includes('sparkleSmokePublisherV2'));assert.ok(!worker.includes('www.yoursparklesuite.com'));
 assert.ok(sources.get('popup.html').toString().includes('SMOKE — synthetic orders only'));
 const altered=new Map(sources);altered.set('manifest.json',Buffer.from(JSON.stringify({...manifest,host_permissions:['https://www.yoursparklesuite.com/*']})));assert.throws(()=>verifySmokeSources(altered));console.log('PASS');`
 expect(execFileSync(process.execPath,['--input-type=module','-e',script],{encoding:'utf8'}).trim()).toBe('PASS')
})
