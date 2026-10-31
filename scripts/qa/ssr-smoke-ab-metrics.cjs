// Pure acceptance gates. Waivers affect only the phone absolute LCP target.
const ABSOLUTE_PHONE_WAIVERS = Object.freeze([
  'gilded_autumn/homepage', 'gilded_autumn/join',
  'alpine_opal/homepage', 'alpine_opal/join', 'alpine_opal/trade',
]);
const median = values => {
  if (!values.length || values.some(v => !Number.isFinite(v) || v < 0)) throw Error('Missing/invalid measurement');
  const sorted = [...values].sort((a,b) => a-b), mid = Math.floor(sorted.length/2);
  return sorted.length%2 ? sorted[mid] : (sorted[mid-1]+sorted[mid])/2;
};
function tapGate(ms, phase, renderer) {
  const baselineOnly=renderer==='legacy', limitMs=phase==='loading'?300:200;
  return {baselineOnly,limitMs,warn:!baselineOnly&&phase==='loading'&&ms>200,pass:baselineOnly||ms<=limitMs};
}
function verdict(rows, cases, runs) {
  if (!Number.isInteger(runs) || runs < 5) throw Error('At least five runs required');
  const gates = [];
  // Measurement failures remain fatal for both renderers. Legacy runtime errors
  // are baseline information; candidate errors include late paint/tap errors.
  gates.push({gate:'errors',pass:rows.length>0 && rows.every(r=>!r.error && (r.renderer==='legacy' || (r.pageErrors===0 && r.hydrationErrors===0)))});
  function samples(kind, id, profile, renderer, phase) {
    const found = rows.filter(r => r.kind===kind && r.id===id && r.profile===profile && r.renderer===renderer && (kind!=='tap'||r.phase===phase));
    if(found.length!==runs || new Set(found.map(r=>r.run)).size!==runs || found.some(r => r.error || !r.valid)) throw Error(`Incomplete ${kind}/${id}/${profile}/${renderer}/${phase||''}`);
    return found;
  }
  for(const profile of ['phone','desktop']) {
    for(const id of cases.interactions) for(const renderer of ['candidate','legacy']) for(const phase of ['loading','idle']) for(const action of cases.actions(id,renderer)) {
      const ms = median(samples('tap',id+':'+action,profile,renderer,phase).map(r=>r.ms));
      gates.push({gate:'tap',id,action,phase,profile,renderer,medianMs:ms,...tapGate(ms,phase,renderer)});
    }
    for(const id of cases.pages) {
      const candidate=samples('paint',id,profile,'candidate'), legacy=samples('paint',id,profile,'legacy');
      for(const metric of ['fcp','lcp']) {
        const ms=median(candidate.map(r=>r[metric])), baseline=median(legacy.map(r=>r[metric]));
        gates.push({gate:metric+'-vs-legacy',id,profile,medianMs:ms,baselineMs:baseline,pass:ms<=baseline});
      }
      // Any shift fails, even when its median would be zero.
      gates.push({gate:'cls',id,profile,pass:candidate.every(r=>r.cls===0)});
      const lcp=median(candidate.map(r=>r.lcp)), limit=profile==='phone'?2500:2000;
      const waived=profile==='phone' && ABSOLUTE_PHONE_WAIVERS.includes(id);
      gates.push({gate:'absolute-lcp',id,profile,medianMs:lcp,limitMs:limit,waived,pass:waived||lcp<limit});
    }
  }
  return {pass:gates.every(g=>g.pass),gates};
}
module.exports={median,verdict,tapGate,ABSOLUTE_PHONE_WAIVERS};
