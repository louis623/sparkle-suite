const NAME_KEY = "sparkle-suite.swap-request.customer-name";
const DRAFT_PREFIX = "sparkle-suite.swap-request.draft:";
const DAY = 86_400_000;
const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
const types = ["RG", "NK", "ER", "ST", "BR"];

export function browserStorage(key) {
  try { return window[key]; } catch { return null; }
}

export function rememberName(storage, name, now = Date.now()) {
  const value = name.trim();
  if (!value || value.length > 100) return;
  try { storage?.setItem(NAME_KEY, JSON.stringify({ name: value, savedAt: now })); } catch {}
}

export function clearName(storage) {
  try { storage?.removeItem(NAME_KEY); } catch {}
}

export function readName(storage, now = Date.now()) {
  try {
    const saved = JSON.parse(storage?.getItem(NAME_KEY) || "null");
    if (typeof saved?.name === "string" && saved.name.trim() && saved.name.length <= 100 &&
      Number.isFinite(saved.savedAt) && saved.savedAt <= now && now - saved.savedAt < 30 * DAY) return saved.name.trim();
    clearName(storage);
  } catch {}
  return "";
}

export function saveDraft(storage, site, draft) {
  try {
    if (!draft) storage?.removeItem(DRAFT_PREFIX + site);
    else storage?.setItem(DRAFT_PREFIX + site, JSON.stringify({ ...draft, site }));
  } catch {}
}

export function restoreDraft(storage, site, now = Date.now()) {
  try {
    const d = JSON.parse(storage?.getItem(DRAFT_PREFIX + site) || "null");
    if (!d || d.site !== site || !uuid.test(d.submissionId) || !uuid.test(d.listingId) ||
        !Number.isFinite(d.savedAt) || d.savedAt > now || now - d.savedAt >= 2 * 3600_000 ||
        typeof d.name !== "string" || d.name.length > 100 ||
        typeof d.family !== "string" || d.family.length > 100 || (d.type && !types.includes(d.type))) return null;
    if (d.attempt) {
      const p = d.attempt;
      if (p.listingId !== d.listingId || p.submissionId !== d.submissionId || !p.customerName?.trim() ||
          p.customerName !== d.name.trim() || p.customerDescription !== "" ||
          p.offeredType !== (d.type || null) || p.offeredFamily !== (d.family.trim() || null) ||
          typeof p.manualReviewRequested !== "boolean" || (p.uploadId !== null && !uuid.test(p.uploadId))) return null;
    }
    return d;
  } catch { return null; }
}

export function canSend({ name, file, ready, optional, pending, checking }) {
  return Boolean(name.trim() && name.trim().length <= 100 && !pending && !checking && (file ? ready : optional));
}

export function freezeSend({ name, family, type, listingId, submissionId, uploadId, manualReviewRequested }) {
  return Object.freeze({
    customerName: name.trim(), customerDescription: "", offeredFamily: family.trim() || null,
    offeredType: type || null, listingId, submissionId, uploadId: uploadId || null, manualReviewRequested,
  });
}

export function validReceipt(result, payload) {
  return result?.listingId === payload.listingId && uuid.test(result.requestId) &&
    /^\/trade-request\/status\/[a-f0-9]{64}$/.test(result.receiptUrl);
}

// The timer races the whole operation (including reading its response body).
// A fetch implementation that ignores AbortSignal must still release the UI.
export async function deadline(ms, operation, parentSignal) {
  const controller = new AbortController();
  let timer, interrupt;
  const interrupted = new Promise((_, reject) => { interrupt = reject; });
  const cancel = () => {
    controller.abort();
    interrupt(new DOMException("Cancelled", "AbortError"));
  };
  try {
    if (parentSignal?.aborted) throw new DOMException("Cancelled", "AbortError");
    parentSignal?.addEventListener("abort", cancel, { once: true });
    timer = setTimeout(() => {
      controller.abort();
      interrupt(Object.assign(new Error("The connection timed out."), { code: "TIMEOUT" }));
    }, ms);
    return await Promise.race([interrupted, operation(controller.signal)]);
  } finally {
    clearTimeout(timer);
    parentSignal?.removeEventListener("abort", cancel);
  }
}

export function publishReceipt(result, payload, publish, storage, analytics) {
  if (!validReceipt(result, payload)) throw new Error("Your private status link could not be confirmed.");
  publish(result);
  rememberName(storage, payload.customerName);
  try { analytics?.(); } catch {}
}

export function isTransient(error) {
  return !error?.status || error.status === 408 || error.status === 429 || error.status >= 500;
}

export async function readJson(response, fallback) {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(body?.error || fallback);
    error.code = body?.code || "";
    error.status = response.status;
    error.attemptClosed = body?.attemptClosed === true;
    const retry = response.headers.get("retry-after");
    const delay = retry == null ? 0 : /^\d+$/.test(retry) ? Number(retry) * 1000 : Date.parse(retry) - Date.now();
    error.retryAfterMs = Number.isFinite(delay) ? Math.max(0, delay) : 0;
    throw error;
  }
  return body;
}

export function jsonRequest(url, payload, signal, method = "POST") {
  return fetch(url, { method, headers: { "content-type": "application/json", accept: "application/json" },
    cache: "no-store", body: JSON.stringify(payload), signal }).then(r => readJson(r, "Please try again."));
}

export function openTransport(lock, setPending, isMounted) {
  if (lock.current) return null;
  const controller = new AbortController();
  lock.current = controller;
  setPending(true);
  const current = () => lock.current === controller && isMounted();
  return {
    current,
    run: operation => deadline(30_000, operation, controller.signal),
    finish() {
      if (!current()) return false;
      lock.current = null;
      setPending(false);
      return true;
    },
  };
}
