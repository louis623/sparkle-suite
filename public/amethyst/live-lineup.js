(function (root) {
  const RETAIN_SECONDS = 3600;
  const isRevision = (value) => Number.isSafeInteger(value) && value >= 0;
  const time = (value) => typeof value === 'string' ? Date.parse(value) : NaN;
  function valid(next) {
    if (!next || !['live', 'empty', 'delayed', 'offline'].includes(next.liveQueueState) ||
        !Array.isArray(next.liveQueueEntries) || next.liveQueueEntries.length > 2000 ||
        !next.liveQueueEntries.every((entry, index) => entry && typeof entry.name === 'string' &&
          entry.name.trim().length > 0 && entry.name.length <= 160 && entry.position === index + 1) ||
        typeof next.liveQueueSummary !== 'string' || next.liveQueueSummary.length > 500) return false;
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
    if (isRevision(current?.liveQueueRevision)) {
      if (!isRevision(next.liveQueueRevision) || next.liveQueueRevision < current.liveQueueRevision) return current;
      // Equal revisions may refresh health, never replace names. Offline expiry may clear them.
      if (next.liveQueueRevision === current.liveQueueRevision &&
          next.liveQueueState !== 'offline' && current.liveQueueState !== 'offline' &&
          JSON.stringify(next.liveQueueEntries.map(e => e.name)) !== JSON.stringify(current.liveQueueEntries.map(e => e.name))) return current;
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
    const age = isRevision(current?.liveQueueRevision)
      ? (current.liveQueueAgeSeconds == null ? Infinity : current.liveQueueAgeSeconds + Math.max(0, elapsedSeconds))
      : (now - time(current?.liveQueueLastUpdated)) / 1000;
    const retain = Number.isFinite(age) && age >= 0 && age <= RETAIN_SECONDS;
    return {
      ...current,
      liveQueueState: retain ? 'delayed' : 'offline',
      liveQueueEntries: retain ? (current?.liveQueueEntries || []).map((entry) => ({ ...entry, label: 'Position at last update', highlight: false })) : [],
      liveQueueSummary: retain ? 'Showing the latest lineup while we check for updates.' : 'Live Lineup is waiting for a recent update. Retrying automatically.',
    };
  }
  function start({ url, initial, onUpdate, random = Math.random, monotonicNow = () => typeof performance === 'undefined' ? Date.now() : performance.now() }) {
    let current = initial, stopped = false, timer, controller, busy = false, failures = 0;
    let lastAcceptedAt = monotonicNow();
    async function poll() {
      if (stopped || busy) return;
      clearTimeout(timer);
      if (document.visibilityState === 'hidden') return;
      busy = true;
      controller = new AbortController();
      const deadline = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error('Lineup unavailable');
        const next = await response.json();
        const merged = merge(current, next);
        if (merged === current) throw new Error('Lineup response not current');
        current = merged;
        lastAcceptedAt = monotonicNow();
        failures = 0;
      } catch {
        failures += 1;
        current = unavailable(current, Date.now(), (monotonicNow() - lastAcceptedAt) / 1000);
      } finally {
        clearTimeout(deadline);
        busy = false;
        if (!stopped) {
          onUpdate(current);
          if (document.visibilityState !== 'hidden') timer = setTimeout(poll, Math.min(30000, 5000 * 2 ** Math.min(failures, 3)) * (0.9 + random() * 0.2));
        }
      }
    }
    function resume() { clearTimeout(timer); if (document.visibilityState !== 'hidden') void poll(); }
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('online', resume);
    void poll();
    return () => { stopped = true; clearTimeout(timer); controller?.abort(); document.removeEventListener('visibilitychange', resume); window.removeEventListener('online', resume); };
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
  root.SparkleLiveLineup = { merge, unavailable, start, useDialog };
})(typeof window === 'undefined' ? globalThis : window);
