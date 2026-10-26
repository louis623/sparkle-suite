const fs=require('node:fs'),path=require('node:path');
const folder=process.argv[2],read=name=>JSON.parse(fs.readFileSync(path.join(folder,name)));
const base=read('base-suite.json'),candidate=read('final-suite.json'),recheck=read('final-contract-recheck.json');
const normalized=report=>report.testResults.map(file=>({...file,key:file.name.split(/[/\\]tests[/\\]/)[1]}));
const fixes=[...normalized(recheck),...normalized(read('font-fix-tests.json')),...normalized(read('rep-read-final-tests.json')),...normalized(read('analytics-paint-tests.json'))];
const fixed=new Map(fixes.map(file=>[file.key,file]));
const current=normalized(candidate).map(file=>fixed.get(file.key)||file);
const assertions=files=>files.flatMap(file=>file.assertionResults.map(test=>({file:file.key,name:test.fullName,status:test.status,message:test.failureMessages?.[0]?.split('\n')[0]})));
const b=assertions(normalized(base)),c=assertions(current);
const oldFailures=new Set(b.filter(t=>t.status==='failed').map(t=>t.file+'|'+t.name));
const counts=tests=>Object.fromEntries(['passed','failed','pending','skipped','todo'].map(status=>[status,tests.filter(t=>t.status===status).length]));
const report={
 baseCommit:'e78fa626c443124ba11725dc93d32e859985ffa4',
 candidateApplication:'fba6acda25a46e64747c01601d23066099f2eb84',
 base:counts(b),candidateWithFocusedRechecks:counts(c),
 remainingFailures:c.filter(t=>t.status==='failed'),
 newFailures:c.filter(t=>t.status==='failed'&&!oldFailures.has(t.file+'|'+t.name)),
 failedFilesWithoutFailedAssertions:current.filter(f=>f.status==='failed'&&!f.assertionResults.some(t=>t.status==='failed')).map(f=>({file:f.key,message:f.message?.split('\n')[0]})),
 limitation:'Initial complete runs on both base and candidate did not finish workspace-card-qr-flyer.test.ts. Its isolated check also did not finish within three minutes; the verified worker processes were stopped. The final full candidate rerun excludes that file; it is not a passing full suite. The final assertion, Neon controller, font-metric, request-loading, and analytics scheduling changes were checked separately after the full run; focused file results replace the earlier file results above.'
};
fs.writeFileSync(path.join(folder,'test-comparison.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({base:report.base,candidate:report.candidateWithFocusedRechecks,newFailures:report.newFailures.map(f=>f.file),failedImportFiles:report.failedFilesWithoutFailedAssertions.map(f=>f.file)},null,2));
