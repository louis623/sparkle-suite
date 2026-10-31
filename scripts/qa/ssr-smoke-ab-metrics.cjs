// Pure acceptance gates, also used by the offline unit tests.
const median = values => {
  if (!values.length || values.some(v => !Number.isFinite(v) || v < 0)) throw Error('Missing/invalid measurement');
  const sorted = [...values].sort((a,b) => a-b), mid = Math.floor(sorted.length/2);
  return sorted.length%2 ? sorted[mid] : (sorted[mid-1]+sorted[mid])/2;
};
function verdict(rows, cases, runs) {
  if (!Number.isInteger(runs) || runs < 5) throw Error('At least five runs required');
  const gates = [];
  function group(kind, id, profile, renderer, metric) {
    const samples = rows.filter(r => r.kind===kind && r.id===id && r.profile===profile && r.renderer===renderer);
    if(samples.length!==runs || samples.some(r => r.error || !r.valid)) throw Error(`Incomplete ${kind}/${id}/${profile}/${renderer}`);
    return median(samples.map(r => r[metric]));
  }
  for(const profile of ['phone','desktop']) {
    for(const id of cases.interactions) for(const renderer of ['candidate','legacy']) for(const action of ['pause','play','sound','nav','cta']) {
      const ms = group('tap',id+':'+action,profile,renderer,'ms');
      gates.push({gate:'tap',id,action,profile,renderer,medianMs:ms,pass:ms<=200});
    }
    for(const id of cases.pages) {
      const fcp = group('paint',id,profile,'candidate','fcp');
      const baseline = group('paint',id,profile,'baseline53','fcp');
      gates.push({gate:'fcp-vs-53c43d0b',id,profile,medianMs:fcp,baselineMs:baseline,pass:fcp<=baseline});
      if(id==='alpine_opal/trade') {
        const lcp = group('paint',id,profile,'candidate','lcp'), legacy = group('paint',id,profile,'legacy','lcp');
        gates.push({gate:'trade-lcp-vs-legacy',id,profile,medianMs:lcp,baselineMs:legacy,pass:lcp<=legacy});
      }
    }
  }
  return {pass:gates.every(g=>g.pass),gates};
}
module.exports={median,verdict};
