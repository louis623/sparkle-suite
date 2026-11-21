// Bounded Chrome update checks. This module never touches a page or publisher credentials.
(function(root) {
  "use strict";
  const STATES = new Set(['unknown','checking','no_update','throttled','downloaded','installing','failed']);
  const RELOAD_INTERVAL = 60_000;
  const METADATA_INTERVAL = 300_000;
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
  function create({storage, key, version, fetchRelease, requestCheck, reload, now = Date.now}) {
    let writes = Promise.resolve();
    let checking;
    let metadata;
    let notifyDownload;
    let reloading = false;

    async function load() {
      const value = (await storage.get(key))[key];
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    }

    function save(patch) {
      const result = writes.then(async () => {
        const current = await load();
        const next = {...current, ...(typeof patch === 'function' ? patch(current) : patch)};
        await storage.set({[key]: next});
        return next;
      });
      writes = result.catch(() => {});
      return result;
    }

    function resetSession() {
      return save({reloadAttempts: {}});
    }

    async function getStatus() {
      const state = await load();
      const release = descriptor(state.release, now());
      return {
        updateState: STATES.has(state.updateState) ? state.updateState : 'unknown',
        latestPublishedVersion: release?.rolloutEnabled ? release.version : null,
      };
    }

    function refreshMetadata() {
      if (metadata) return metadata;
      metadata = (async () => {
        const state = await load();
        const time = now();
        if (time >= state.metadataAt && time - state.metadataAt < METADATA_INTERVAL) return;
        await save({metadataAt: time});
        try {
          const release = descriptor(await fetchRelease(), now());
          if (release) await save({release});
        } catch {
          // Store discovery and installation do not depend on the release endpoint.
        }
      })().finally(() => { metadata = null; });
      return metadata;
    }

    async function onUpdateAvailable(target) {
      if (compare(target, version) !== 1 || reloading) return false;
      let allowed = false;
      await save(current => {
        if (reloading) return {};
        const attempts = current.reloadAttempts || {};
        const time = now();
        const previous = attempts[target];
        if (previous && (previous.count >= 3 || time - previous.at < RELOAD_INTERVAL)) return {};
        allowed = true;
        reloading = true;
        return {
          reloadAttempts: {...attempts, [target]: {count: (previous?.count || 0) + 1, at: time}},
          reloadTarget: target,
          updateState: 'installing',
        };
      }).catch(error => { if (allowed) reloading = false; throw error; });
      if (!allowed) return false;
      try {
        reload();
        notifyDownload?.('installing');
      } catch {
        reloading = false;
        await save({updateState: 'failed'});
        notifyDownload?.('failed');
        return false;
      }
      return true;
    }

    function checkAndInstall({waitMs = 60_000} = {}) {
      if (!checking) {
        checking = runCheck(waitMs).finally(() => { checking = null; });
      }
      return checking;
    }

    async function runCheck(waitMs) {
      if (reloading) return 'installing';
      const stored = await load();
      const unreconciled = compare(stored.reloadTarget, version) === 1;
      if (stored.reloadTarget) {
        await save(current => current.reloadTarget === stored.reloadTarget && !reloading
          ? {reloadTarget: null, updateState: unreconciled ? 'failed' : 'unknown'} : {});
      }
      if (reloading) return 'installing';
      await save(current => reloading ? {} : {updateState: 'checking'});
      let timer;
      try {
        const downloaded = new Promise(resolve => { notifyDownload = resolve; });
        const result = await Promise.race([requestCheck(), downloaded]);
        if (typeof result === 'string') return result;
        if (reloading) return 'installing';
        let state;
        if (result?.status === 'update_available' && compare(result.version, version) === 1) {
          const remaining = Math.max(0, waitMs);
          state = await Promise.race([downloaded, new Promise(resolve => {
            timer = setTimeout(() => resolve('downloaded'), remaining);
          })]);
        } else {
          state = result?.status === 'throttled' || result?.status === 'no_update' ? result.status : 'failed';
          if (unreconciled && state === 'no_update') state = 'failed';
        }
        if (reloading) return 'installing';
        await save(() => reloading ? {} : {updateState: state});
        return reloading ? 'installing' : state;
      } catch {
        await save(() => reloading ? {} : {updateState: 'failed'});
        return reloading ? 'installing' : 'failed';
      } finally {
        clearTimeout(timer);
        notifyDownload = null;
      }
    }

    return Object.freeze({getStatus, refreshMetadata, resetSession, checkAndInstall, onUpdateAvailable});
  }
  const api=Object.freeze({create,compare,descriptor});root.SparkleUpdateClient=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
