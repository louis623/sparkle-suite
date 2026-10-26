const fs=require('node:fs'),path=require('node:path');
const [evidenceRoot,reportDir]=process.argv.slice(2);
if(!evidenceRoot||!reportDir)throw Error('Usage: node hero-real-report.cjs EVIDENCE_ROOT REPORT_DIR');
fs.mkdirSync(reportDir,{recursive:true});
const read=p=>fs.existsSync(p)?JSON.parse(fs.readFileSync(p)):[];
const routes=read('scripts/qa/hero-real-routes.json');
const median=a=>{const b=[...a].sort((x,y)=>x-y);return b.length?b[Math.floor(b.length/2)]:null};
const measurements={},functional={};
for(const mode of ['phone','desktop']){
 measurements[mode]=read(path.join(evidenceRoot,`final-lighthouse-${mode}`,`${mode}-lighthouse-summary.json`));
 functional[mode]=read(path.join(evidenceRoot,'final-hydration',`${mode}-results.json`));
}
const rows=routes.map(route=>{
 const row={...route};
 for(const mode of ['phone','desktop']){
  const values=measurements[mode].filter(r=>r.slug===route.slug);
  const check=functional[mode].find(r=>r.slug===route.slug);
  row[mode]={runs:values.length,missingPostAuditSSRMarker:values.filter(r=>r.serverRendered===false).length,documentTransferMedianBytes:median(values.map(r=>r.documentTransferBytes).filter(Number.isFinite)),previewUrls:[...new Set(values.map(r=>new URL(r.requestedUrl).origin))],lcpMedianMs:median(values.map(r=>r.lcp)),clsMedian:median(values.map(r=>r.cls)),lcpMaxMs:values.length?Math.max(...values.map(r=>r.lcp)):null,clsMax:values.length?Math.max(...values.map(r=>r.cls)):null,hydration:check?check.initial?.retained===true&&check.initial?.hydrated===true&&!check.errors.length:null,autoplayAndControls:check?.pass??null,tapMaxMs:check?.interactionMaxMs??null,functionalFcpMs:check?.initial?.paint?.find(p=>p.name==='first-contentful-paint')?.ms??null,functionalLcpMs:check?.initial?.lcp??null,functionalCls:check?.initial?.cls??null,analytics:check?.analytics??[]};
  for(const [folder,filename] of [[`final-lighthouse-${mode}`,`${mode}-${route.slug}-1-lighthouse-filmstrip.png`],['final-hydration',`${mode}-${route.slug}-filmstrip.png`]]){
   const source=path.join(evidenceRoot,folder,filename);if(fs.existsSync(source))fs.copyFileSync(source,path.join(reportDir,filename));
  }
 }
 return row;
});
fs.writeFileSync(path.join(reportDir,'real-route-summary.json'),JSON.stringify(rows,null,2));
for(const mode of ['phone','desktop']){
 fs.writeFileSync(path.join(reportDir,`${mode}-lighthouse-summary.json`),JSON.stringify(measurements[mode],null,2));
 // Keep only public outcome data here; raw traces and full browser observations
 // remain in the local evidence directory referenced by the pass report.
}
const themeName=key=>key==='sparkle_suite_morganite'?'Morganite':key.split('_').map(word=>word[0].toUpperCase()+word.slice(1)).join(' ');
const fmt=(n,d=3)=>n===null?'pending':n.toFixed(d);
let md='# Real rep-route results\n\nApplication `c42b6c8683ad1bc0f6c7c16d05f48033d32e6148`, immutable [preview](https://sparkle-suite-smoke-heuiayc2a-louis-2849s-projects.vercel.app). No Smoke or Live alias moved.\n\nLighthouse 13.5.0, fresh Google Chrome 156.0.8078.47 process per sample in isolated Linux test VMs (4 vCPUs, Intel Xeon 2.50GHz). Environment files accompany this table. Phone: 360×800, simulated slow 4G, 4× CPU. Desktop: 1440×900, Lighthouse desktop network settings. Five samples per route/profile; no blocked analytics or assets. CLS is the maximum session window, not the sum of all shifts. Max columns retain outliers.\n\n';
md+='| Theme / real route | Phone n | Phone LCP median (max), s | Phone CLS median (max) | Desktop n | Desktop LCP median (max), s | Desktop CLS median (max) | Missing post-audit SSR marker phone / desktop | Timing gates |\n|---|---:|---:|---:|---:|---:|---:|---:|---|\n';
for(const r of rows)md+=`| ${themeName(r.theme)} [/${r.slug}](https://sparkle-suite-smoke-heuiayc2a-louis-2849s-projects.vercel.app/${r.slug}) | ${r.phone.runs} | ${fmt(r.phone.lcpMedianMs===null?null:r.phone.lcpMedianMs/1000)} (${fmt(r.phone.lcpMaxMs===null?null:r.phone.lcpMaxMs/1000)}) | ${fmt(r.phone.clsMedian,4)} (${fmt(r.phone.clsMax,4)}) | ${r.desktop.runs} | ${fmt(r.desktop.lcpMedianMs===null?null:r.desktop.lcpMedianMs/1000)} (${fmt(r.desktop.lcpMaxMs===null?null:r.desktop.lcpMaxMs/1000)}) | ${fmt(r.desktop.clsMedian,4)} (${fmt(r.desktop.clsMax,4)}) | ${r.phone.missingPostAuditSSRMarker} / ${r.desktop.missingPostAuditSSRMarker} | ${r.phone.runs===5&&r.desktop.runs===5?(r.phone.lcpMedianMs<=2500&&r.desktop.lcpMedianMs<2000&&r.phone.clsMedian<=.05&&r.desktop.clsMedian<=.05?'pass':'FAIL'):'incomplete'} |\n`;
md+='\nThe SSR-marker column is a snapshot **after** Lighthouse finishes its back/forward-cache navigation audit, not a server-response fallback count. One Mile High Fizz desktop snapshot lacked the marker; its measured document was 99,692 bytes and its screenshot was themed. The audit reports a reload caused by no-store. Treat the missing marker as inconclusive; the separate response-HTML checks and retained-node browser checks are the hydration proof. No sample was discarded.\n';
md+='\n## Hydration, autoplay and controls\n\nHydration passes only if the original server hero and heading nodes remain after hydration and no React/hydration/unsafe-SVG error was observed. Motion/control checks use Windows Chrome 155 with real network throttling on phone, separately from Lighthouse simulation. Their pass column includes the 200ms tap gate, so Neon can autoplay correctly while failing that combined gate. A dash for tap latency means that theme has no existing hero buttons. Only Amethyst, Fall Owl and Sunset Beach contain audio.\n\n| Theme / route | Phone hydration | Desktop hydration | Phone motion/controls | Desktop motion/controls | Phone / desktop tap max ms | Filmstrips phone / desktop |\n|---|---|---|---|---|---:|---|\n';
const status=x=>x===null?'pending':x?'pass':'FAIL';
for(const r of rows)md+=`| ${themeName(r.theme)} [/${r.slug}](https://sparkle-suite-smoke-heuiayc2a-louis-2849s-projects.vercel.app/${r.slug}) | ${status(r.phone.hydration)} | ${status(r.desktop.hydration)} | ${status(r.phone.autoplayAndControls)} | ${status(r.desktop.autoplayAndControls)} | ${r.phone.tapMaxMs??'—'} / ${r.desktop.tapMaxMs??'—'} | [phone](${`phone-${r.slug}-filmstrip.png`}) / [desktop](${`desktop-${r.slug}-filmstrip.png`}) |\n`;
md+='\nThe corresponding `*-1-lighthouse-filmstrip.png` files are Lighthouse trace thumbnails, captured without real network throttling and interpreted through Lighthouse simulation. The linked functional filmstrips show actual throttled phone loading. Do not describe simulated thumbnails as a physical slow-phone recording.\n';
md+='\n## Windows first-paint observations\n\nThese are single actual-throttle browser runs, not the five-run simulated Lighthouse medians. Slow startup outliers remain visible and block a blanket no-blank-screen claim.\n\n| Real route | Phone FCP / LCP, s | Phone CLS | Desktop FCP / LCP, s | Desktop CLS |\n|---|---:|---:|---:|---:|\n';
for(const r of rows)md+=`| /${r.slug} | ${fmt(r.phone.functionalFcpMs/1000)} / ${fmt(r.phone.functionalLcpMs/1000)} | ${fmt(r.phone.functionalCls,4)} | ${fmt(r.desktop.functionalFcpMs/1000)} / ${fmt(r.desktop.functionalLcpMs/1000)} | ${fmt(r.desktop.functionalCls,4)} |\n`;
fs.writeFileSync(path.join(reportDir,'README.md'),md);
console.log(JSON.stringify({routes:rows.length,measurements:Object.fromEntries(Object.entries(measurements).map(([m,a])=>[m,a.length])),functional:Object.fromEntries(Object.entries(functional).map(([m,a])=>[m,a.length]))}));
