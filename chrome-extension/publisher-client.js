// Sparkle Suite v2 transport core. Dependencies are worker-only; never expose credentials to a page.
(function (root) {
  "use strict";
  const CREDENTIAL = /^(?:sslp_[A-Za-z0-9_-]{43}|[A-Z0-9]{3}-[0-9]{4})$/;
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  const ID = /^[A-Za-z0-9][A-Za-z0-9:_-]{0,127}$/;
  const invalidReasons = new Set([
    'invalid_scope', 'columns_changed', 'duplicate_columns', 'missing_order_identity', 'duplicate_order_identity',
    'invalid_order_time', 'invalid_first_name', 'capacity_exceeded', 'scan_capacity_exceeded', 'parser_exception',
  ]);
  const loadingReasons = new Set(['table_missing','table_busy','table_incomplete','table_settling']);
  const partialReasons = new Set(['table_incomplete','row_incomplete','reveal_state_missing','selected_party_not_visible']);
  const reasonsFor = state => state === 'invalid' ? invalidReasons : state === 'loading' ? loadingReasons : state === 'partial' ? partialReasons : new Set();
  const version = value => typeof value === 'string' && /^\d{1,5}(?:\.\d{1,5}){0,3}$/.test(value);
  const updateStates = new Set(['unknown','checking','no_update','throttled','downloaded','installing','failed']);
  function cleanStructure(input) {
    const keys = ['version','columns','bodyCount','rowCount','unmatchedRows','hasOrderIdAttribute','hasPartyIdAttribute','hasOrderTimeAttribute'];
    const columns = ['PartyID','OrderID','FirstName','LastName','OrderDate','IsRevealed','unknown'];
    const buckets = ['0','1-10','11-100','101-1000','1001-10000','10001+'];
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length !== keys.length
      || Object.keys(input).some(key => !keys.includes(key)) || input.version !== 1
      || !Array.isArray(input.columns) || input.columns.length > 32 || input.columns.some(value => !columns.includes(value))
      || !Number.isSafeInteger(input.bodyCount) || input.bodyCount < 0 || input.bodyCount > 32
      || !buckets.includes(input.rowCount) || !buckets.includes(input.unmatchedRows)
      || ['hasOrderIdAttribute','hasPartyIdAttribute','hasOrderTimeAttribute'].some(key => typeof input[key] !== 'boolean')) return null;
    return {version:1,columns:[...input.columns],bodyCount:input.bodyCount,rowCount:input.rowCount,unmatchedRows:input.unmatchedRows,
      hasOrderIdAttribute:input.hasOrderIdAttribute,hasPartyIdAttribute:input.hasPartyIdAttribute,hasOrderTimeAttribute:input.hasOrderTimeAttribute};
  }
  const exactKeys = (value, required, optional = []) => value && typeof value === 'object' && !Array.isArray(value)
    && required.every(key => Object.hasOwn(value,key)) && Object.keys(value).every(key => required.includes(key) || optional.includes(key));
  function cleanValueShape(value) {
    const characters = ['ascii_letters','digits','whitespace','separator','non_ascii','other','control'];
    if (!exactKeys(value,['format','length','characters']) || !['missing','plain','labelled','unsupported'].includes(value.format)
      || !['0','1-10','11-100','101-1000','1001+'].includes(value.length) || !Array.isArray(value.characters)
      || value.characters.length > 7 || new Set(value.characters).size !== value.characters.length
      || value.characters.some(item => !characters.includes(item))) return null;
    return {format:value.format,length:value.length,characters:[...value.characters]};
  }
  function cleanIdentityEvidence(value) {
    if (!exactKeys(value,['problem','attribute','cell','link','comparisons'])
      || !['none','missing','unsupported_format','conflict'].includes(value.problem)
      || !exactKeys(value.comparisons,['attributeCell','attributeLink','cellLink'])
      || Object.values(value.comparisons).some(item => !['match','mismatch','unavailable'].includes(item))) return null;
    const attribute=cleanValueShape(value.attribute), cell=cleanValueShape(value.cell), link=cleanValueShape(value.link);
    if (!attribute || !cell || !link) return null;
    return {problem:value.problem,attribute,cell,link,comparisons:{attributeCell:value.comparisons.attributeCell,
      attributeLink:value.comparisons.attributeLink,cellLink:value.comparisons.cellLink}};
  }
  function cleanFailure(value) {
    if (!exactKeys(value,['version','stage','rowIndex','cellCount'],['order','party']) || value.version !== 1
      || !['identity','row','date','name','reveal','columns','scope','capacity','table'].includes(value.stage)
      || !(value.rowIndex === null || Number.isSafeInteger(value.rowIndex) && value.rowIndex >= 0 && value.rowIndex <= 50000)
      || !(value.cellCount === null || Number.isSafeInteger(value.cellCount) && value.cellCount >= 0 && value.cellCount <= 32)) return null;
    const order=value.order === undefined ? undefined : cleanIdentityEvidence(value.order);
    const party=value.party === undefined ? undefined : cleanIdentityEvidence(value.party);
    if (order === null || party === null) return null;
    return {version:1,stage:value.stage,rowIndex:value.rowIndex,cellCount:value.cellCount,...(order ? {order} : {}),...(party ? {party} : {})};
  }
  function diagnostics(snapshot, sourceVersion) {
    const structure = cleanStructure(snapshot?.structure);
    const failure = snapshot?.parserState === 'ready' ? null : cleanFailure(snapshot?.failure);
    return {sourceVersion,readerVersion:version(snapshot?.readerVersion) ? snapshot.readerVersion : null,
      updateState:updateStates.has(snapshot?.updateState) ? snapshot.updateState : 'unknown',parserState:snapshot?.parserState || 'loading',
      ...(structure ? {structure} : {}), ...(failure ? {failure} : {}),
      ...(reasonsFor(snapshot?.parserState).has(snapshot?.reason) ? {parserReason:snapshot.reason} : {})};
  }
  const integer = n => Number.isSafeInteger(n) && n >= 0;
  const time = s => typeof s === "string" && Number.isFinite(Date.parse(s));
  function cleanSnapshot(input) {
    if (!input || !["ready", "loading", "partial", "invalid"].includes(input.parserState)
      || !Array.isArray(input.entries) || !Array.isArray(input.revealedIds)
      || input.entries.length > 2000 || input.revealedIds.length > 10000) return null;
    const seen = new Set(), entries = [], revealedIds = [];
    for (const e of input.entries) {
      if (!e || typeof e.id !== "string" || !ID.test(e.id) || seen.has(e.id) || typeof e.name !== "string" || !e.name.trim()
        || e.name.trim().length > 100 || Array.from(e.name).some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)
        || !(e.orderedAt === null || integer(e.orderedAt) && e.orderedAt <= 8640000000000000)) return null;
      const surname = typeof e.lastName === 'string' ? e.lastName.trim() : '';
      const lastName = surname && surname.length <= 100 && !/[\u0000-\u001f\u007f]/.test(surname) ? surname : null;
      seen.add(e.id); entries.push({id: e.id, name: e.name.trim(), orderedAt: e.orderedAt, ...(lastName ? {lastName} : {})});
    }
    for (const id of input.revealedIds) {
      if (typeof id !== "string" || !ID.test(id) || seen.has(id)) return null;
      seen.add(id); revealedIds.push(id);
    }
    let revealedEntries;
    if (input.revealedEntries !== undefined) {
      if (!Array.isArray(input.revealedEntries) || input.revealedEntries.length !== revealedIds.length) return null;
      const remaining = new Set(revealedIds);
      revealedEntries = [];
      for (const e of input.revealedEntries) {
        if (!e || typeof e.id !== "string" || !remaining.delete(e.id)
          || !(e.orderedAt === null || integer(e.orderedAt) && e.orderedAt <= 8640000000000000)) return null;
        revealedEntries.push({id: e.id, orderedAt: e.orderedAt});
      }
    }
    let observation;
    if (input.observation !== undefined) {
      const o = input.observation;
      if (!o || !UUID.test(o.documentId || '') || !integer(o.serial) || !time(o.serverTime) || typeof o.settled !== 'boolean'
        || input.parserState === 'ready' && !o.settled) return null;
      observation = {documentId:o.documentId,serial:o.serial,serverTime:o.serverTime,settled:o.settled};
    }
    const reason = typeof input.reason === "string" && /^[a-z_]{1,64}$/.test(input.reason) ? input.reason : null;
    const structure = cleanStructure(input.structure);
    const failure = input.parserState === 'ready' ? null : cleanFailure(input.failure);
    return {parserState: input.parserState, reason, updateState:updateStates.has(input.updateState) ? input.updateState : 'unknown', ...(structure ? {structure} : {}), ...(failure ? {failure} : {}), ...(Object.hasOwn(input,"readerVersion") ? {readerVersion:version(input.readerVersion) ? input.readerVersion : null} : {}), entries, revealedIds, ...(revealedEntries ? {revealedEntries} : {}), ...(observation ? {observation} : {})};
  }
  function validClaim(r, generation = 0) {
    return r && r.generation === generation && integer(generation) && typeof r.publisherId === "string" && UUID.test(r.publisherId) && integer(r.epoch) && r.epoch > 0 && integer(r.revision)
      && Number.isSafeInteger(r.acceptedSequence) && r.acceptedSequence >= -1
      && time(r.serverTime) && time(r.leaseExpiresAt)
      && Date.parse(r.leaseExpiresAt) > Date.parse(r.serverTime)
      && Date.parse(r.leaseExpiresAt) - Date.parse(r.serverTime) <= 90000;
  }
  function validAck(r, sequence) {
    return r && r.ok === true && r.acceptedSequence === sequence && integer(r.revision)
      && time(r.serverTime) && time(r.leaseExpiresAt)
      && Date.parse(r.leaseExpiresAt) > Date.parse(r.serverTime)
      && Date.parse(r.leaseExpiresAt) - Date.parse(r.serverTime) <= 90000;
  }
  // store.update must compare configVersion atomically within the worker's serialized storage adapter.
  // post must use the fixed Suite endpoint, bounded JSON, timeout, and no automatic credential redirects.
  function createPublisherClient({store, post, now = Date.now, randomId = () => crypto.randomUUID(), random = Math.random}) {
    let busy = false;
    async function sync(input, sourceVersion, {readyHint = false, diagnosticSnapshot = null} = {}) {
      if (busy) return {status: "busy"};
      let snapshot = typeof input === 'function' ? null : cleanSnapshot(input);
      if (typeof input !== 'function' && !snapshot || typeof sourceVersion !== "string" || !/^[A-Za-z0-9._+-]{1,64}$/.test(sourceVersion)) return {status: "invalid_source"};
      const versionParts = sourceVersion.split('.').map(Number);
      const upgraded = versionParts[0] === 2 && (versionParts[1] > 0 || versionParts[1] === 0 && versionParts[2] >= 5);
      busy = true;
      let state;
      try {
        state = await store.load();
        if (!state || !state.enabled || !CREDENTIAL.test(state.token || "")) return {status: "not_configured"};
        if (state.authFailed) return {status: "needs_connection"};
        if (state.needsSelection || !integer(state.generation)) return {status: "needs_selection"};
        const wait = (state.nextAttemptAt || 0) - now();
        if (wait > 0 && wait <= 60000) return {status: "backoff"};
        const patch = async changes => {
          if (!await store.update(state.configVersion, changes)) throw Object.assign(new Error("configuration_changed"), {code: "configuration_changed"});
          state = {...state, ...changes};
        };
        if (!UUID.test(state.claimId || "")) await patch({claimId: randomId(), needsClaim: true, epoch: null, publisherId: null, nextSequence: 0});
        if (state.needsClaim || !state.epoch || !state.publisherId) {
          if (!readyHint && state.recoveryRetryAt > now()) return {status:'backoff'};
          const receipt = await post(state.token, {action: "claim", claimId: state.claimId, generation: state.generation, ...(diagnosticSnapshot ? {diagnostics:diagnostics(cleanSnapshot(diagnosticSnapshot),sourceVersion)} : {}), ...(upgraded ? {capabilities:'lineup-2.0.5'} : {})});
          if (!validClaim(receipt, state.generation) || upgraded && (receipt.claimId !== state.claimId || receipt.capabilities !== 'lineup-2.0.5')) throw Object.assign(new Error("invalid_receipt"), {code: "invalid_receipt"});
          await patch({publisherId: receipt.publisherId, epoch: receipt.epoch, needsClaim: false,
            nextSequence: Math.max(integer(state.nextSequence) ? state.nextSequence : 0, receipt.acceptedSequence + 1)});
        }
        // The callable source is read AFTER a successful lease receipt. Claim/network
        // latency can never turn an earlier table read into a fresh observation.
        snapshot = typeof input === 'function' ? cleanSnapshot(await input()) : snapshot;
        if (snapshot && Object.hasOwn(snapshot,'readerVersion') && snapshot.readerVersion !== sourceVersion) {
          snapshot = {...snapshot,parserState:'partial',reason:null,failure:undefined,entries:[],revealedIds:[],revealedEntries:[],
            ...(snapshot.observation ? {observation:{...snapshot.observation,settled:false}} : {})};
        }
        const readCompletedAt = now();
        if (!snapshot || upgraded && !snapshot.observation || state.generation > 0 && snapshot.parserState === 'ready' && snapshot.revealedIds.length && !snapshot.revealedEntries)
          throw Object.assign(new Error('invalid_source'),{code:'invalid_source'});
        const sequence = state.nextSequence;
        if (!integer(sequence) || !integer(sequence + 1)) throw Object.assign(new Error("sequence_exhausted"), {code: "sequence_exhausted"});
        // Persist BEFORE sending: a worker restart cannot reuse a sequence for different content.
        await patch({nextSequence: sequence + 1});
        const sentAt = now();
        if (upgraded && (sentAt < readCompletedAt || sentAt - readCompletedAt > 5000))
          throw Object.assign(new Error('stale_observation'),{code:'stale_observation'});
        const {reason, readerVersion, updateState, structure, failure, ...sourcePacket} = snapshot;
        const report = Object.hasOwn(snapshot,"readerVersion") ? diagnostics(snapshot,sourceVersion) : null;
        const receipt = await post(state.token, {action: "snapshot", packet: {...sourcePacket,
          ...(reasonsFor(snapshot.parserState).has(reason) ? {parserReason: reason} : {}),
          ...(report ? {diagnostics:report} : {}),
          generation: state.generation, sourceVersion, publisherId: state.publisherId, epoch: state.epoch, sequence,
          ...(upgraded ? {claimId:state.claimId} : {})}});
        if (!validAck(receipt, sequence)) throw Object.assign(new Error("invalid_receipt"), {code: "invalid_receipt"});
        const receivedAt = now(), transit = receivedAt - sentAt;
        if (upgraded && (!Number.isFinite(receipt.freshForMs) || receipt.freshForMs < 0 || receipt.freshForMs > 45000))
          throw Object.assign(new Error('invalid_receipt'),{code:'invalid_receipt'});
        const remaining = transit < 0 ? 0 : Math.max(0, (upgraded ? receipt.freshForMs : 45000) - transit);
        const nonReadyClaims = snapshot.parserState === 'ready' ? 0 : (state.nonReadyClaims || 0) + 1;
        await patch({lastAckAt: receivedAt, lastReadyAckAt: snapshot.parserState === "ready" ? receivedAt - (45000 - remaining) : state.lastReadyAckAt || null,
          readyDeadline: snapshot.parserState === 'ready' ? receivedAt + remaining : 0,
          parserState: snapshot.parserState, parserReason: snapshot.reason, diagnostics:report, lastError: null, failureCount: 0, nextAttemptAt: 0, nonReadyClaims,
          recoveryRetryAt: nonReadyClaims >= 2 ? receivedAt + 120000 : 0});
        return {status: snapshot.parserState === "ready" ? "confirmed" : "source_not_ready", revision: receipt.revision};
      } catch (error) {
        const allowed = ["unauthorized", "lease_expired", "lease_required", "source_unavailable", "publisher_conflict", "revision_conflict", "stale_sequence", "rate_limited", "invalid_receipt", "invalid_payload", "invalid_source", "source_not_ready", "stale_observation", "capacity_exceeded", "sequence_exhausted", "configuration_changed", "show_changed", "invalid_scope"];
        const code = allowed.includes(error?.code) ? error.code : "connection_failed";
        if (state && code !== "configuration_changed") {
          const failureCount = Math.min((state.failureCount || 0) + 1, 8);
          const delay = Math.min(30000, 1000 * 2 ** failureCount) * (1 + Math.max(0, Math.min(1, random())) * 0.25);
          await store.update(state.configVersion, {lastError: code, failureCount, nextAttemptAt: now() + delay,
            needsClaim: true, ...(["show_changed", "invalid_scope"].includes(code) ? {needsSelection: true} : {}), ...(code === "unauthorized" ? {authFailed: true} : {}),
            ...(["lease_expired", "lease_required"].includes(code) ? {claimId: null, epoch: null, publisherId: null} : {})}).catch(() => false);
        }
        return {status: code};
      } finally { busy = false; }
    }
    return Object.freeze({sync});
  }
  const api = Object.freeze({createPublisherClient, cleanSnapshot, validClaim, validAck});
  root.SparklePublisherClient = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
