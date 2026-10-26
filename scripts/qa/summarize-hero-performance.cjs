const fs = require('node:fs'), path = require('node:path');
const folder = process.argv[2];
const median = values => { const sorted=[...values].sort((a,b)=>a-b); return sorted[Math.floor(sorted.length/2)]; };
const rows = [];
for (const mode of ['phone','desktop']) {
  const file=path.join(folder,mode+'-performance.json');
  if (!fs.existsSync(file)) continue;
  const samples=JSON.parse(fs.readFileSync(file));
  for (const theme of [...new Set(samples.map(s=>s.theme))]) {
    const runs=samples.filter(s=>s.theme===theme);
    const valid=runs.every(s=>s.status===200&&!s.error&&!s.errors.length&&s.productionRuntime&&!s.unstyled&&Number.isFinite(s.lcpNavigation));
    const lcp=median(runs.map(s=>s.lcpNavigation));
    const cls=median(runs.map(s=>s.cls));
    rows.push({theme,mode,runs:runs.length,lcp,cls,valid,pass:runs.length===5&&valid&&lcp<(mode==='phone'?2500.001:2000)&&cls<=0.05,samples:runs.map(s=>({run:s.run,lcp:s.lcpNavigation,cls:s.cls,errors:s.errors,error:s.error,sourceCommit:s.sourceCommit||process.argv[3]||null,deliveryUnchangedOnFinal:s.deliveryUnchangedOnFinal||false}))});
  }
}
fs.writeFileSync(path.join(folder,'summary.json'),JSON.stringify(rows,null,2));
const themes=[...new Set(rows.map(r=>r.theme))];
const table=['| Theme | Phone LCP (s) | Phone CLS | Desktop LCP (s) | Desktop CLS | Status |','|---|---:|---:|---:|---:|---|'];
for(const theme of themes){
 const p=rows.find(r=>r.theme===theme&&r.mode==='phone'),d=rows.find(r=>r.theme===theme&&r.mode==='desktop');
 table.push(`| ${theme} | ${p?(p.lcp/1000).toFixed(3):'pending'} | ${p?p.cls.toFixed(4):'pending'} | ${d?(d.lcp/1000).toFixed(3):'pending'} | ${d?d.cls.toFixed(4):'pending'} | ${p?.pass&&d?.pass?'Pass':'Incomplete / fail'} |`);
}
fs.writeFileSync(path.join(folder,'table.md'),table.join('\n')+'\n');
console.log(JSON.stringify({profiles:rows.length,passed:rows.filter(r=>r.pass).length,failures:rows.filter(r=>r.runs===5&&!r.pass).map(({theme,mode,lcp,cls,valid})=>({theme,mode,lcp,cls,valid})),last:rows.at(-1)},null,2));
