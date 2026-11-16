// Bounded Chrome update checks. This module never touches a page or publisher credentials.
(function(root) {
  "use strict";
  const STATES = new Set(['unknown','checking','no_update','throttled','downloaded','installing','failed']);
  const FIVE_MINUTES=300000, HOUR=3600000, DAY=86400000, BROKEN_FOR=600000;
  function versionParts(value) {
    if (typeof value !== 'string' || !/^(?:0|[1-9][0-9]{0,4})(?:\.(?:0|[1-9][0-9]{0,4})){0,3}$/.test(value)) return null;
    const parts=value.split('.').map(Number);
    return parts.every(n=>n<=65535) && parts.some(n=>n>0) ? [...parts,...Array(4-parts.length).fill(0)] : null;
  }
  function compare(a,b) {
    const x=versionParts(a),y=versionParts(b); if(!x||!y)return null;
    for(let i=0;i<4;i++)if(x[i]!==y[i])return x[i]>y[i]?1:-1; return 0;
  }
  function descriptor(value,now) {
    if(!value || typeof value!=='object' || Array.isArray(value) || Object.keys(value).sort().join(',')!=='protocol,publishedAt,rolloutEnabled,version'
      || value.protocol!==1 || !versionParts(value.version) || typeof value.rolloutEnabled!=='boolean')return null;
    if(value.publishedAt===null && !value.rolloutEnabled)return {...value};
    if(typeof value.publishedAt!=='string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value.publishedAt)
      || !Number.isFinite(Date.parse(value.publishedAt)) || Date.parse(value.publishedAt)>now)return null;
    return {...value};
  }
  function elapsed(now,then,limit) {return Number.isFinite(then) && now>=then && now-then<limit;}
  function create({storage,key,version,fetchRelease,requestCheck,reload,now=Date.now}) {
    let mutations=Promise.resolve();
    async function load(){const value=(await storage.get(key))[key];return value && typeof value==='object' && !Array.isArray(value)?value:{};}
    function save(patch){const result=mutations.then(async()=>{const current=await load(),value={...current,...(typeof patch==='function'?patch(current):patch)};await storage.set({[key]:value});return value;});mutations=result.catch(()=>{});return result;}
    async function getState(){const s=await load();return STATES.has(s.updateState)?s.updateState:'unknown';}
    async function noteDownload(target){if(compare(target,version)!==1)return false;await save({downloadedVersion:target,updateState:'downloaded'});return true;}
    async function check(){
      let s=await load(),time=now();
      const installed=target=>{const order=compare(version,target);return order!==null && order>=0;};
      // Chrome may install while idle without our reload attempt. Reconcile both records independently.
      // Recheck inside the write queue so a newer download arriving concurrently cannot be erased.
      if(installed(s.attemptVersion) || installed(s.downloadedVersion))s=await save(current=>{
        const attemptedInstalled=installed(current.attemptVersion),downloadInstalled=installed(current.downloadedVersion);
        return {...(attemptedInstalled?{attemptVersion:null,attemptAt:null}:{}),
          ...(downloadInstalled?{downloadedVersion:null}:{}),
          ...(downloadInstalled || attemptedInstalled && !current.downloadedVersion?{updateState:'unknown'}:{})};
      });
      // An attempted reload which left the same version running stays blocked for its full cooldown.
      if(elapsed(time,s.descriptorCheckedAt,FIVE_MINUTES))return;
      s=await save({descriptorCheckedAt:time}); // persist before network; worker restarts must not hammer the origin
      let release;
      try {release=descriptor(await fetchRelease(),now());if(!release)throw Error('invalid_release');}
      catch {await save({release:null,updateState:s.downloadedVersion?'downloaded':'failed'});return;}
      s=await save({release});
      if(!release.rolloutEnabled || compare(release.version,version)!==1)return;
      if(s.downloadedVersion===release.version)return;
      if(elapsed(time,s.chromeCheckedAt,HOUR))return;
      await save({chromeCheckedAt:time,checkTarget:release.version,updateState:'checking'});
      try {
        const result=await requestCheck();
        if(result?.status==='update_available' && compare(result.version,version)===1)await noteDownload(result.version);
        else await save({updateState:result?.status==='throttled'?'throttled':result?.status==='no_update'?'no_update':'failed'});
      } catch {await save({updateState:'failed'});}
    }
    async function consider(context){
      let c=await context(),s=await load(),time=now();
      const active=c.tabCount===1 && c.enabled;
      // Only continuous observations count. A sleeping/restarted browser is not ten minutes of observed failure.
      const brokenAt=active && !c.healthy ? (s.sourceIdentity===(c.sourceIdentity ?? null) && elapsed(time,s.lastObservedAt,90000) && Number.isFinite(s.brokenAt) && time>=s.brokenAt?s.brokenAt:time) : null;
      s=await save({brokenAt,lastObservedAt:time,sourceIdentity:c.sourceIdentity ?? null});
      const eligible=(ctx,state,t,ownAttempt=false)=>{
        const r=descriptor(state.release,t);
        return r?.rolloutEnabled && elapsed(t,state.descriptorCheckedAt,FIVE_MINUTES) && state.downloadedVersion===r.version
          && compare(state.downloadedVersion,version)===1 && !ctx.busy && !ctx.pendingActions
          && (ownAttempt || !(state.attemptVersion===state.downloadedVersion && (t<state.attemptAt || elapsed(t,state.attemptAt,DAY))))
          && (ctx.tabCount===0 || ctx.tabCount===1 && ctx.enabled && !ctx.healthy
            && state.sourceIdentity===(ctx.sourceIdentity ?? null) && Number.isFinite(state.brokenAt) && t>=state.brokenAt && t-state.brokenAt>=BROKEN_FOR
            && (!Number.isFinite(ctx.lastReadyAckAt) || t>=ctx.lastReadyAckAt && t-ctx.lastReadyAckAt>=BROKEN_FOR));
      };
      if(!eligible(c,s,time))return false;
      c=await context();s=await load();time=now();if(!eligible(c,s,time))return false;
      await save({attemptVersion:s.downloadedVersion,attemptAt:time,updateState:'installing'});
      // A popup action or tab change may arrive while storage is being written. Keep the attempt marker if refused.
      c=await context();
      if(!eligible(c,await load(),now(),true)){
        await save({updateState:'downloaded'});return false;
      }
      reload();return true;
    }
    return Object.freeze({getState,noteDownload,check,consider});
  }
  const api=Object.freeze({create,compare,descriptor});root.SparkleUpdateClient=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
