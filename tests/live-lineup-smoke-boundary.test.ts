import {expect,it} from 'vitest'
import {evaluateBranchPolicy} from '../scripts/check-active-branch.mjs'
import {execFileSync} from 'node:child_process'

it('authorizes the isolated feature clone and only the exact Smoke deployment project',()=>{
 const input={branch:'codex/live-lineup-v52-smoke',remoteRepository:'louis623/sparkle-suite',worktree:'C:\\Users\\louis\\AppData\\Local\\Temp\\sparkle-lineup-v52-20260926',platform:'win32'}
 expect(evaluateBranchPolicy(input)).toEqual([])
 expect(evaluateBranchPolicy({...input,worktree:'C:\\Users\\louis\\sparkle-suite-repo'})).not.toEqual([])
 expect(evaluateBranchPolicy({...input,isVercel:true,projectId:'prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ'})).toEqual([])
 for(const projectId of [undefined,'prj_zCKmYDx1Sbs9hA1Lokzdv9Qm0TM3','prj_PvqPYv0R3DclFbFmM6vVNX2Q50gl'])expect(evaluateBranchPolicy({...input,isVercel:true,projectId})).not.toEqual([])
})

it('packages deterministic Smoke identity, endpoint, isolated storage, warning and exact inventory',()=>{
 const script = `import assert from 'node:assert/strict'; import {buildSmokeSources,verifySmokeSources} from './scripts/smoke-environment/package-extension.mjs';
 const sources=buildSmokeSources(),result=verifySmokeSources(sources);assert.equal(result.manifestVersion,'2.0.5');
 const manifest=JSON.parse(sources.get('manifest.json'));assert.deepEqual(manifest.host_permissions,['https://myoffice.bombparty.com/*','https://sparkle-suite-smoke.vercel.app/*']);
 const worker=sources.get('background.js').toString();assert.ok(worker.includes('sparkleSmokePublisherV2'));assert.ok(!worker.includes('www.yoursparklesuite.com'));
 assert.ok(sources.get('popup.html').toString().includes('SMOKE — synthetic orders only'));
 const altered=new Map(sources);altered.set('manifest.json',Buffer.from(JSON.stringify({...manifest,host_permissions:['https://www.yoursparklesuite.com/*']})));assert.throws(()=>verifySmokeSources(altered));console.log('PASS');`
 expect(execFileSync(process.execPath,['--input-type=module','-e',script],{encoding:'utf8'}).trim()).toBe('PASS')
})
