(function (root) {
  const RETAIN_SECONDS = 3600;
  const PRESENTATION = 'grouped-v1';
  const grouped = (value) => value?.liveQueuePresentation === PRESENTATION;
  const shape = (value) => JSON.stringify((value.liveQueueEntries || []).map(e => [e.name, e.token, e.remainingOrders]));
  const isRevision = (value) => Number.isSafeInteger(value) && value >= 0;
  const time = (value) => typeof value === 'string' ? Date.parse(value) : NaN;
  function valid(next) {
    if (!next || !['live', 'empty', 'delayed', 'offline'].includes(next.liveQueueState) ||
        !Array.isArray(next.liveQueueEntries) || next.liveQueueEntries.length > 2000 ||
        !next.liveQueueEntries.every((entry, index) => entry && typeof entry.name === 'string' &&
          entry.name.trim().length > 0 && entry.name.length <= 160 && entry.position === index + 1) ||
        typeof next.liveQueueSummary !== 'string' || next.liveQueueSummary.length > 500) return false;
    if (grouped(next) && (!isRevision(next.liveQueueEventCursor) || !Array.isArray(next.liveQueueEvents) || next.liveQueueEvents.length > 64 ||
        !(next.liveQueueScope === null || /^[A-Za-z0-9_-]{32}$/.test(next.liveQueueScope)) ||
        !next.liveQueueEntries.every(e => typeof e.token === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(e.token) && Number.isSafeInteger(e.remainingOrders) && e.remainingOrders > 0 && e.remainingOrders <= 2000) ||
        new Set(next.liveQueueEntries.map(e => e.token)).size !== next.liveQueueEntries.length ||
        !next.liveQueueEvents.every(e => isRevision(e.cursor) && e.cursor <= next.liveQueueEventCursor && Number.isFinite(e.ageSeconds) && e.ageSeconds >= 0 && (e.target === null || next.liveQueueEntries.some(row => row.token === e.target))))) return false;
    if (next.liveQueueState === 'empty' && next.liveQueueEntries.length) return false;
    if (next.liveQueueState === 'offline' && next.liveQueueEntries.length) return false;
    if (next.liveQueueState === 'live' && !next.liveQueueEntries.length) return false;
    if (next.liveQueueRevision !== undefined && (!isRevision(next.liveQueueRevision) ||
        typeof next.liveQueueSourceReady !== 'boolean' || !Number.isFinite(time(next.liveQueueServerTime)))) return false;
    if (!isRevision(next.liveQueueRevision) && time(next.liveQueueLastUpdated) > Date.now() + 60000) return false;
    if (next.liveQueueAgeSeconds != null && (!Number.isFinite(next.liveQueueAgeSeconds) || next.liveQueueAgeSeconds < 0)) return false;
    return Number.isFinite(time(next.liveQueueLastUpdated)) ||
      (next.liveQueueState === 'offline' && next.liveQueueLastUpdated === null && !next.liveQueueEntries.length);
  }
  function merge(current, next) {
    if (!valid(next)) return current;
    if (!valid(current)) return next;
    if (grouped(current) !== grouped(next)) return current;
    if (grouped(current) && current.liveQueueScope === next.liveQueueScope && next.liveQueueEventCursor < current.liveQueueEventCursor) return current;
    if (isRevision(current?.liveQueueRevision)) {
      if (!isRevision(next.liveQueueRevision) || next.liveQueueRevision < current.liveQueueRevision) return current;
      // Equal revisions may refresh health, never replace names. Offline expiry may clear them.
      if (next.liveQueueRevision === current.liveQueueRevision &&
          next.liveQueueState !== 'offline' && current.liveQueueState !== 'offline' &&
          shape(next) !== shape(current)) return current;
      if (time(next.liveQueueServerTime) < time(current.liveQueueServerTime)) return current;
    } else if (!isRevision(next.liveQueueRevision)) {
      if (time(next.liveQueueLastUpdated) < time(current?.liveQueueLastUpdated)) return current;
      if (time(next.liveQueueLastUpdated) === time(current?.liveQueueLastUpdated) &&
          JSON.stringify(next.liveQueueEntries.map(e => e.name)) !== JSON.stringify((current.liveQueueEntries || []).map(e => e.name))) return current;
    }
    return next;
  }
  function unavailable(current, now = Date.now(), elapsedSeconds = 0) {
    // V2 age is server age plus elapsed monotonic time, not browser/sender wall clocks.
    const age = Number.isFinite(current?.liveQueueAgeSeconds) || isRevision(current?.liveQueueRevision)
      ? (current.liveQueueAgeSeconds == null ? Infinity : current.liveQueueAgeSeconds + Math.max(0, elapsedSeconds))
      : (now - time(current?.liveQueueLastUpdated)) / 1000;
    const retain = Number.isFinite(age) && age >= 0 && age <= RETAIN_SECONDS;
    return {
      ...current,
      liveQueueFlare: null,
      ...(grouped(current) ? { liveQueueEvents: [], ...(!retain ? { liveQueueOrderCount: 0, liveQueueGroupCount: 0, liveQueueCurrent: null, liveQueueOnDeck: null } : {}) } : {}),
      liveQueueState: retain ? 'delayed' : 'offline',
      liveQueueEntries: retain ? (current?.liveQueueEntries || []).map((entry) => ({ ...entry, label: 'Position at last update', highlight: false })) : [],
      liveQueueSummary: retain ? 'Showing the latest lineup while we check for updates.' : 'Live Lineup is waiting for a recent update. Retrying automatically.',
    };
  }
  function fresh(current) {
    return ['live', 'empty'].includes(current?.liveQueueState) && current.liveQueueSourceReady !== false &&
      Number.isFinite(current.liveQueueAgeSeconds) && current.liveQueueAgeSeconds < (current.liveQueueStaleAfterSeconds || 45);
  }
  function afterTransit(next, seconds) {
    if (!Number.isFinite(next?.liveQueueAgeSeconds)) return next;
    const adjusted = { ...next, liveQueueAgeSeconds: next.liveQueueAgeSeconds + Math.max(0, seconds),
      ...(grouped(next) ? { liveQueueEvents: next.liveQueueEvents.map(e => ({ ...e, ageSeconds: e.ageSeconds + Math.max(0, seconds) })) } : {}) };
    return adjusted.liveQueueAgeSeconds >= (adjusted.liveQueueStaleAfterSeconds || 45) ? unavailable(adjusted) : adjusted;
  }
  // Consume the cursor even when reversal, hiding, ambiguity or expiry suppresses an effect.
  function revealUpdate(current, next, baseline) {
    if (!grouped(next)) return next;
    const eligible = !baseline && grouped(current) && current.liveQueueScope === next.liveQueueScope &&
      current.liveQueueState !== 'offline' && next.liveQueueEventCursor >= current.liveQueueEventCursor && fresh(next);
    const events = eligible ? next.liveQueueEvents.filter(e => e.cursor > current.liveQueueEventCursor && e.ageSeconds < 45) : [];
    const event = events.at(-1);
    return { ...next, liveQueueFlare: event ? { cursor: event.cursor, target: event.target, scope: next.liveQueueScope } : null };
  }
  function start({ url, initial, onUpdate, random = Math.random, monotonicNow = () => typeof performance === 'undefined' ? Date.now() : performance.now() }) {
    const contract = grouped(initial) ? PRESENTATION : 'legacy';
    const separator = url.indexOf('?');
    const path = separator < 0 ? url : url.slice(0, separator);
    const query = separator < 0 ? [] : url.slice(separator + 1).split('&').filter(part => {
      try { return decodeURIComponent(part.split('=')[0]) !== 'lineupPresentation'; } catch { return false; }
    });
    if (contract === PRESENTATION) query.push('lineupPresentation=' + PRESENTATION);
    const pollUrl = path + (query.length ? '?' + query.join('&') : '');
    let current = grouped(initial) ? unavailable(initial) : initial, stopped = false, timer, healthTimer, controller, busy = false, failures = 0, baseline = true, context = 0;
    let lastAcceptedAt = monotonicNow();
    function scheduleHealth() {
      clearTimeout(healthTimer);
      if (!Number.isFinite(current?.liveQueueAgeSeconds) || current.liveQueueState === 'offline') return;
      const elapsed = Math.max(0, (monotonicNow() - lastAcceptedAt) / 1000);
      const limit = fresh(current) ? (current.liveQueueStaleAfterSeconds || 45) : RETAIN_SECONDS;
      const delay = Math.max(1, (limit - current.liveQueueAgeSeconds - elapsed) * 1000 + 1);
      healthTimer = setTimeout(() => {
        if (stopped) return;
        current = unavailable(current, Date.now(), Math.max(0, (monotonicNow() - lastAcceptedAt) / 1000));
        if (current.liveQueueState === 'offline') baseline = true;
        onUpdate(current);
        if (current.liveQueueState !== 'offline') scheduleHealth();
      }, delay);
    }
    async function poll() {
      if (stopped || busy) return;
      clearTimeout(timer);
      if (document.visibilityState === 'hidden') return;
      busy = true;
      const requestContext = context, requestStarted = monotonicNow();
      controller = new AbortController();
      const deadline = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch(pollUrl, { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error('Lineup unavailable');
        const raw = await response.json();
        if (requestContext !== context || stopped) return;
        if ((grouped(raw) ? PRESENTATION : 'legacy') !== contract || !valid(raw)) throw new Error('Unsupported lineup presentation');
        const next = afterTransit(raw, Math.max(0, (monotonicNow() - requestStarted) / 1000));
        const merged = merge(current, next);
        if (merged === current) throw new Error('Lineup response not current');
        current = revealUpdate(current, merged, baseline);
        baseline = current.liveQueueState === 'offline';
        lastAcceptedAt = monotonicNow();
        failures = 0;
      } catch {
        if (requestContext !== context || stopped) return;
        failures += 1;
        current = unavailable(current, Date.now(), Math.max(0, (monotonicNow() - lastAcceptedAt) / 1000));
        if (current.liveQueueState === 'offline') baseline = true;
      } finally {
        clearTimeout(deadline);
        busy = false;
        if (!stopped) {
          onUpdate(current);
          scheduleHealth();
          if (document.visibilityState !== 'hidden') timer = setTimeout(poll, requestContext !== context ? 1 : Math.min(30000, 5000 * 2 ** Math.min(failures, 3)) * (0.9 + random() * 0.2));
        }
      }
    }
    function suspend() {
      context += 1; baseline = true; controller?.abort(); clearTimeout(timer); clearTimeout(healthTimer);
      current = unavailable(current, Date.now(), Math.max(0, (monotonicNow() - lastAcceptedAt) / 1000));
      onUpdate(current);
    }
    function visibility() { suspend(); if (document.visibilityState !== 'hidden') void poll(); }
    function resume() { if (document.visibilityState !== 'hidden') { clearTimeout(timer); void poll(); } }
    function restored() { suspend(); resume(); }
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', suspend);
    window.addEventListener('pageshow', restored);
    window.addEventListener('online', resume);
    scheduleHealth();
    void poll();
    return () => { stopped = true; clearTimeout(timer); clearTimeout(healthTimer); controller?.abort(); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pagehide', suspend); window.removeEventListener('pageshow', restored); window.removeEventListener('online', resume); };
  }
  function useRevealFlare(React, lineup) {
    const last = React.useRef(null);
    React.useEffect(() => {
      const flare = lineup?.liveQueueFlare;
      if (!flare || last.current === flare.scope + ':' + flare.cursor) return;
      last.current = flare.scope + ':' + flare.cursor;
      const painted = [];
      for (const surface of ['list', 'ticker']) {
        const containers = [...document.querySelectorAll('[data-lineup-surface="' + surface + '"]')].filter(el => el.getClientRects().length);
        const container = containers.find(el => el.closest('[role="dialog"]')) || containers[0];
        if (!container) continue;
        const matches = flare.target === null ? [container] : [...container.querySelectorAll('[data-lineup-token]')].filter(el => el.dataset.lineupToken === flare.target && el.dataset.lineupClone !== 'true');
        if (!matches.length) matches.push(container);
        if (matches.length !== 1) continue;
        matches[0].setAttribute('data-lineup-flare', 'true'); painted.push(matches[0]);
      }
      const timer = setTimeout(() => painted.forEach(el => el.removeAttribute('data-lineup-flare')), 1000);
      return () => { clearTimeout(timer); painted.forEach(el => el.removeAttribute('data-lineup-flare')); };
    }, [lineup?.liveQueueFlare]);
  }
  function useDialog(React, open, onClose) {
    const ref = React.useRef(null), close = React.useRef(onClose);
    close.current = onClose;
    React.useEffect(() => {
      if (!open || !ref.current) return;
      const previous = document.activeElement, dialog = ref.current;
      const overflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const focusable = () => [...dialog.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), [tabindex="0"]')].filter(el => !el.hidden);
      (focusable()[0] || dialog).focus();
      function focusin(event) { if (!dialog.contains(event.target)) (focusable()[0] || dialog).focus(); }
      function keydown(event) {
        if (event.key === 'Escape') { event.preventDefault(); close.current(); }
        if (event.key !== 'Tab') return;
        const items = focusable(), first = items[0] || dialog, last = items[items.length - 1] || dialog;
        if (!dialog.contains(document.activeElement) || (event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
          event.preventDefault(); (event.shiftKey ? last : first).focus();
        }
      }
      document.addEventListener('keydown', keydown);
      document.addEventListener('focusin', focusin);
      return () => { document.removeEventListener('keydown', keydown); document.removeEventListener('focusin', focusin); document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus(); };
    }, [open]);
    return ref;
  }
  root.SparkleLiveLineup = { merge, unavailable, afterTransit, revealUpdate, initialState: value => grouped(value) ? unavailable(value) : value, start, useDialog, useRevealFlare };
})(typeof window === 'undefined' ? globalThis : window);
