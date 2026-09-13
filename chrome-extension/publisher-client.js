// Sparkle Suite v2 transport core. Dependencies are worker-only; never expose credentials to a page.
(function (root) {
  "use strict";
  const TOKEN = /^sslp_[A-Za-z0-9_-]{43}$/;
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  const ID = /^[A-Za-z0-9][A-Za-z0-9:_-]{0,127}$/;
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
      seen.add(e.id); entries.push({id: e.id, name: e.name.trim(), orderedAt: e.orderedAt});
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
    return {parserState: input.parserState, entries, revealedIds, ...(revealedEntries ? {revealedEntries} : {})};
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
    async function sync(input, sourceVersion) {
      if (busy) return {status: "busy"};
      const snapshot = cleanSnapshot(input);
      if (!snapshot || typeof sourceVersion !== "string" || !/^[A-Za-z0-9._+-]{1,64}$/.test(sourceVersion)) return {status: "invalid_source"};
      busy = true;
      let state;
      try {
        state = await store.load();
        if (!state || !state.enabled || !TOKEN.test(state.token || "")) return {status: "not_configured"};
        if (state.authFailed) return {status: "needs_connection"};
        if (state.needsSelection || !integer(state.generation)) return {status: "needs_selection"};
        if (state.generation > 0 && snapshot.parserState === "ready" && snapshot.revealedIds.length && !snapshot.revealedEntries) return {status: "invalid_source"};
        const wait = (state.nextAttemptAt || 0) - now();
        if (wait > 0 && wait <= 60000) return {status: "backoff"};
        const patch = async changes => {
          if (!await store.update(state.configVersion, changes)) throw Object.assign(new Error("configuration_changed"), {code: "configuration_changed"});
          state = {...state, ...changes};
        };
        if (!UUID.test(state.claimId || "")) await patch({claimId: randomId(), needsClaim: true, epoch: null, publisherId: null, nextSequence: 0});
        if (state.needsClaim || !state.epoch || !state.publisherId) {
          const receipt = await post(state.token, {action: "claim", claimId: state.claimId, generation: state.generation});
          if (!validClaim(receipt, state.generation)) throw Object.assign(new Error("invalid_receipt"), {code: "invalid_receipt"});
          await patch({publisherId: receipt.publisherId, epoch: receipt.epoch, needsClaim: false,
            nextSequence: Math.max(integer(state.nextSequence) ? state.nextSequence : 0, receipt.acceptedSequence + 1)});
        }
        const sequence = state.nextSequence;
        if (!integer(sequence) || !integer(sequence + 1)) throw Object.assign(new Error("sequence_exhausted"), {code: "sequence_exhausted"});
        // Persist BEFORE sending: a worker restart cannot reuse a sequence for different content.
        await patch({nextSequence: sequence + 1});
        const receipt = await post(state.token, {action: "snapshot", packet: {...snapshot,
          generation: state.generation, sourceVersion, publisherId: state.publisherId, epoch: state.epoch, sequence}});
        if (!validAck(receipt, sequence)) throw Object.assign(new Error("invalid_receipt"), {code: "invalid_receipt"});
        await patch({lastAckAt: now(), lastReadyAckAt: snapshot.parserState === "ready" ? now() : state.lastReadyAckAt || null,
          parserState: snapshot.parserState, lastError: null, failureCount: 0, nextAttemptAt: 0});
        return {status: snapshot.parserState === "ready" ? "confirmed" : "source_not_ready", revision: receipt.revision};
      } catch (error) {
        const allowed = ["unauthorized", "lease_expired", "publisher_conflict", "revision_conflict", "stale_sequence", "rate_limited", "invalid_receipt", "invalid_payload", "sequence_exhausted", "configuration_changed", "show_changed", "invalid_scope"];
        const code = allowed.includes(error?.code) ? error.code : "connection_failed";
        if (state && code !== "configuration_changed") {
          const failureCount = Math.min((state.failureCount || 0) + 1, 8);
          const delay = Math.min(30000, 1000 * 2 ** failureCount) * (1 + Math.max(0, Math.min(1, random())) * 0.25);
          await store.update(state.configVersion, {lastError: code, failureCount, nextAttemptAt: now() + delay,
            needsClaim: true, ...(["show_changed", "invalid_scope"].includes(code) ? {needsSelection: true} : {}), ...(code === "unauthorized" ? {authFailed: true} : {}),
            ...(code === "lease_expired" ? {claimId: null, epoch: null, publisherId: null} : {})}).catch(() => false);
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
