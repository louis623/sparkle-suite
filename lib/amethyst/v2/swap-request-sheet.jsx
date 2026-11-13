/* global React */
import { normalizeTradeFamily } from "../../services/trade-request-matcher";
import { deadline, jsonRequest, openTransport, canSend, freezeSend, publishReceipt, browserStorage, readName, clearName, saveDraft, isTransient } from "./swap-request-state.js";
import { attachPhoto, photoType, preparePhoto, safePreview } from "./swap-request-photo.js";

const { useState, useRef, useEffect } = React;
const ACCEPT = "image/jpeg,image/png,image/webp,image/avif,.jpg,.jpeg,.png,.webp,.avif";
const TYPES = [["RG","Ring"], ["NK","Necklace"], ["ER","Earrings"], ["BR","Bracelet"], ["ST","Stack"]];
const staleCodes = new Set(["TRADE_UPLOAD_NOT_READY", "TRADE_UPLOAD_EXPIRED", "TRADE_UPLOAD_NOT_FOUND"]);
function track(name) { try { window.gtag?.("event", name); } catch {} }
function collections(piece) {
  const chips = ["Birthday", "OG", "Sterling Club"].map(label => ({label, value: label}));
  const raw = piece.matcherFamily?.trim();
  const family = normalizeTradeFamily(raw);
  if (family && !["collection pending", "collection unavailable"].includes(raw.toLowerCase()) && !chips.some(c => normalizeTradeFamily(c.value) === family)) {
    chips.push({label: piece.collection || raw, value: raw});
  }
  return chips;
}

export function RequestSheet({ initialPiece, recovered, site, urls, repName, initialFile, demoSuccess, deadlineUntil, board,
  refreshBoard, onClose, onSent, useDialog }) {
  const [piece, setPiece] = useState(initialPiece);
  const [saved, setSaved] = useState(() => readName(browserStorage("localStorage")));
  const [name, setName] = useState(recovered?.name ?? saved);
  const [family, setFamily] = useState(recovered?.family || "");
  const [type, setType] = useState(recovered?.type || "");
  const [other, setOther] = useState(Boolean(recovered?.other));
  const [submissionId, setSubmissionId] = useState(() => recovered?.submissionId || crypto.randomUUID());
  const [step, setStep] = useState(recovered?.attempt ? 2 : 1);
  const [file, setFile] = useState(initialFile || null);
  const [prepared, setPrepared] = useState(null);
  const [attachmentEpoch, setAttachmentEpoch] = useState(0);
  const [preview, setPreview] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [sendAfter, setSendAfter] = useState(0);
  const [confirmClose, setConfirmClose] = useState(false);
  const [receipt, setReceipt] = useState(demoSuccess ? {} : null);
  const [choosing, setChoosing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState(recovered && !recovered.attempt ? "Welcome back, pick your photo again." : "");
  const [error, setError] = useState("");
  const [transport, setTransport] = useState(false);
  const [attempt, setAttempt] = useState(recovered?.attempt || null);
  const [screen, setScreen] = useState(null);
  const [manual, setManual] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [attach, setAttach] = useState(null);
  const [uploadKey, setUploadKey] = useState(0);
  const [now, setNow] = useState(Date.now);
  const [online, setOnline] = useState(navigator.onLine);
  const upload = useRef(null), currentAttempt = useRef(attempt), lock = useRef(null), passive = useRef(null), alive = useRef(true);
  const didAttempt = useRef(Boolean(attempt)), usedNewId = useRef(false), reattached = useRef(false);
  const savedAt = useRef(recovered?.savedAt || Date.now()), urlOwner = useRef(null), successRef = useRef(null);
  const titleRef = useRef(null), thumbRef = useRef(null), changeRef = useRef(null), previewClose = useRef(null);
  const popAction = useRef(null), historyOwner = useRef(crypto.randomUUID()), historyDepth = useRef(0);
  const optional = Boolean(deadlineUntil && Date.parse(deadlineUntil) > Math.max(now, Date.now()));
  useEffect(() => {
    const wait = sendAfter - Date.now();
    if (wait <= 0) return;
    const timer = setTimeout(() => setNow(Date.now()), wait + 1);
    return () => clearTimeout(timer);
  }, [sendAfter]);
  const wasOptional = useRef(optional);
  const readyPhotoRef = useRef(false);
  const draftStorage = () => browserStorage("sessionStorage");
  const draft = (frozen = currentAttempt.current) => ({
    listingId: piece.id, submissionId, name, family, type, other, step, attempt: frozen, savedAt: frozen ? savedAt.current : Date.now()
  });
  const setFrozen = value => {
    currentAttempt.current = value;
    setAttempt(value);
    saveDraft(draftStorage(), site, draft(value));
  };
  const dialog = useDialog(true, () => {
    if (expanded) hidePreview();
    else if (confirmClose) setConfirmClose(false);
    else closeIntent();
  }, receipt ? "success" : "form");

  function pushHistory() {
    historyDepth.current++;
    history.pushState({ ...history.state, swapSheet: historyOwner.current, swapDepth: historyDepth.current }, "");
  }
  function cancelPassive() {
    if (passive.current && passive.current === lock.current) {
      lock.current.abort(); lock.current = null; passive.current = null;
    }
  }
  function finish() {
    saveDraft(draftStorage(), site, null);
    if (history.state?.swapSheet === historyOwner.current && historyDepth.current > 0) history.go(-historyDepth.current);
    onClose();
  }
  function closeIntent() {
    cancelPassive();
    if (lock.current) return;
    if (receipt || (!file && !name && !type && !family && !currentAttempt.current)) finish();
    else setConfirmClose(true);
  }
  function hidePreview(viaPop = false) {
    if (!viaPop && history.state?.swapSheet === historyOwner.current) { history.back(); return; }
    setExpanded(false);
    requestAnimationFrame(() => (thumbRef.current || changeRef.current)?.focus());
  }
  function goBack() { if (!lock.current && !attempt) history.back(); }
  popAction.current = () => {
    historyDepth.current = history.state?.swapSheet === historyOwner.current ? history.state.swapDepth : 0;
    cancelPassive();
    if (lock.current) { pushHistory(); return; }
    if (expanded) { hidePreview(true); return; }
    if (!receipt && step === 2 && !attempt && !confirmClose) {
      if (!historyDepth.current) pushHistory();
      setStep(1); return;
    }
    pushHistory();
    closeIntent();
  };
  useEffect(() => {
    alive.current = true;
    // Reload can preserve old sheet entries. Adopt them so closing returns to the board.
    if (history.state?.swapSheet && recovered) {
      historyOwner.current = history.state.swapSheet;
      historyDepth.current = history.state.swapDepth || 1;
    } else pushHistory();
    const pop = () => popAction.current?.();
    addEventListener("popstate", pop);
    return () => {
      alive.current = false;
      removeEventListener("popstate", pop);
      lock.current?.abort(); lock.current = null;
    };
  }, []);
  useEffect(() => {
    if (!receipt) saveDraft(draftStorage(), site, draft());
  }, [piece.id, submissionId, name, family, other, type, step, receipt]);
  useEffect(() => { if (!expanded) titleRef.current?.focus(); }, [step, receipt, choosing, confirmClose]);
  useEffect(() => { if (expanded) previewClose.current?.focus(); }, [expanded]);
  useEffect(() => {
    setNow(Date.now());
    const remaining = Date.parse(deadlineUntil) - Date.now();
    if (!(remaining > 0)) return;
    const id = setTimeout(() => setNow(Date.now()), remaining + 1);
    return () => clearTimeout(id);
  }, [deadlineUntil]);
  useEffect(() => {
    if (!optional && !readyPhotoRef.current && !attempt && !receipt && step === 2 && (!file || (wasOptional.current && attach?.status === "error"))) {
      if (historyDepth.current < 2) setStep(1);
      setNotice("Photo upload is working again. Add a photo to send your request.");
      if (historyDepth.current >= 2) history.back();
    }
    wasOptional.current = optional;
  }, [optional, step, file, attempt, receipt, attach?.status]);

  useEffect(() => {
    let current = true;
    let objectUrl;
    setPreview(null); setPrepared(null);
    if (file && !receipt) void preparePhoto(file).then(result => {
      if (!current) return;
      objectUrl = safePreview(result.previewBlob);
      urlOwner.current = objectUrl;
      setPreview(objectUrl); setPrepared({source: file, payload: result.file});
    });
    return () => {
      current = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      urlOwner.current = null;
    };
  }, [file, Boolean(receipt), attachmentEpoch]);

  function discardTicket(owner) {
    if (!owner?.ticket || owner.consumed) return;
    const identity = { ...owner.identity, uploadId: owner.ticket.uploadId };
    void deadline(15_000, s => jsonRequest(urls.ticket, identity, s, "DELETE")).catch(() => {});
    owner.ticket = null;
  }
  function stopUpload(clean = true) {
    const owner = upload.current;
    if (!owner) return;
    upload.current = null;
    owner.controller.abort();
    clearTimeout(owner.timer);
    if (clean && !currentAttempt.current) discardTicket(owner);
  }
  function replaceFile(next) {
    if (lock.current || currentAttempt.current) return;
    if (next && !photoType(next)) {
      setError("Choose a JPEG, PNG, WebP, HEIC, HEIF or AVIF image up to 25 MB.");
      return;
    }
    stopUpload();
    if (next === file) setAttachmentEpoch(n => n + 1);
    setAttach(null); setPrepared(null); setPreview(null); setFile(next); setError(""); setNotice("");
    reattached.current = false;
  }
  useEffect(() => {
    if (!file || prepared?.source !== file || receipt || currentAttempt.current) return;
    const controller = new AbortController();
    const owner = {controller, identity: { listingId: piece.id, submissionId }, ticket: null, retries: 0, running: false, resume: null};
    upload.current = owner;
    const active = () => alive.current && upload.current === owner && !controller.signal.aborted;
    const state = (status, label, extra = {}) => { if (active()) setAttach({ owner, status, label, ...extra }); };
    async function run() {
      if (!active() || owner.running || currentAttempt.current) return;
      if (owner.nextAt > Date.now()) return;
      clearTimeout(owner.timer);
      owner.running = true; owner.resume = null;
      discardTicket(owner);
      state("busy", "Preparing photo…");
      try {
        const ticket = await attachPhoto(urls, owner.identity, prepared.payload, controller.signal, {
          refreshPolicy: () => { if (active()) void refreshBoard(); },
          progress: label => state("busy", label),
          ticket: value => { owner.ticket = value; if (!active()) discardTicket(owner); },
        });
        if (active()) { state("ready", "Photo attached.", { ticket }); track("photo_attached"); }
      } catch (e) {
        if (!active()) return;
        if (e.code === "TRADE_UPLOAD_SUBMISSION_LIMIT" && !didAttempt.current && !usedNewId.current) {
          usedNewId.current = true; setSubmissionId(crypto.randomUUID()); return;
        }
        const transient = isTransient(e) || staleCodes.has(e.code) || e.code === "TRADE_UPLOAD_MISSING";
        owner.nextAt = Date.now() + (e.retryAfterMs || 0);
        state("error", e.retryAfterMs ? e.message + " Check again in " + Math.ceil(e.retryAfterMs / 1000) + " seconds." : e.message, { retry: transient, nextAt: owner.nextAt });
        track("photo_upload_failed");
        if (transient) {
          owner.resume = run;
          if (owner.retries++ < 1 && navigator.onLine) owner.timer = setTimeout(run, Math.max(900, e.retryAfterMs || 0));
        }
      } finally { owner.running = false; }
    }
    void run();
    return () => { if (upload.current === owner) stopUpload(!currentAttempt.current); };
  }, [prepared, file, piece.id, submissionId, uploadKey, Boolean(receipt)]);
  useEffect(() => {
    const resume = () => {
      setOnline(navigator.onLine); setNow(Date.now());
      if (document.visibilityState !== "hidden" && navigator.onLine) upload.current?.resume?.();
    };
    addEventListener("online", resume); addEventListener("offline", resume); document.addEventListener("visibilitychange", resume);
    return () => { removeEventListener("online", resume); removeEventListener("offline", resume); document.removeEventListener("visibilitychange", resume); };
  }, []);
  useEffect(() => {
    if (attempt) return;
    if (receipt || !family.trim() || !type) { setScreen(null); return; }
    const controller = new AbortController();
    const key = JSON.stringify([piece.id, type, family]);
    setScreen({ key, checking: true });
    const timer = setTimeout(async () => {
      try {
        const result = await deadline(6000, s => jsonRequest(urls.screen, { listingId: piece.id, offeredFamily: family.trim(), offeredType: type }, s), controller.signal);
        if (!controller.signal.aborted) setScreen({key, ...result});
      } catch { if (!controller.signal.aborted) setScreen({key, failed: true}); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [piece.id, type, family, Boolean(attempt), Boolean(receipt)]);

  const options = collections(piece);
  const activeScreen = screen?.key === JSON.stringify([piece.id, type, family]) ? screen : null;
  const mismatch = manual || activeScreen?.screening?.status === "mismatch";
  const checking = Boolean(type && family.trim() && (!activeScreen || activeScreen.checking));
  const ready = Boolean(attach?.status === "ready" && attach.owner === upload.current && attach.owner.identity.listingId === piece.id && attach.owner.identity.submissionId === submissionId && prepared?.source === file);
  readyPhotoRef.current = ready;
  const allowed = Date.now() >= sendAfter && canSend({name, file, ready, optional, pending: transport || Boolean(attempt) || unavailable, checking});
  function publish(result, frozen) {
    publishReceipt(result, frozen, value => {
      successRef.current = value;
      if (upload.current) upload.current.consumed = true;
      setReceipt(value); setError(""); setConfirmClose(false); setNotice("");
      currentAttempt.current = null; setAttempt(null);
      onSent(piece.id);
    }, browserStorage("localStorage"), () => track("swap_request"));
    saveDraft(draftStorage(), site, null);
  }
  function renewClosedIdentity() {
    setFrozen(null);
    stopUpload();
    setAttach(null);
    const nextId = crypto.randomUUID();
    setSubmissionId(nextId);
    saveDraft(draftStorage(), site, {...draft(null), submissionId: nextId});
    reattached.current = false;
    setNotice(file ? "Re-attaching photo…" : "Review your request before sending again.");
  }
  async function transmit(intent, frozen, afterAbandon) {
    if (intent !== "recover") cancelPassive();
    const passiveLookup = intent === "recover" && !afterAbandon;
    const transport = openTransport(lock, passiveLookup ? () => {} : setTransport, () => alive.current);
    if (transport && passiveLookup) passive.current = lock.current;
    if (!transport) return;
    setError("");
    let needsLookup = false;
    const current = () => transport.current() && !successRef.current;
    try {
      const result = await transport.run(s => jsonRequest(urls.submit, { ...frozen, intent }, s));
      if (!current()) return;
      if (intent !== "abandon" && result?.outcome === "abandoned") {
        renewClosedIdentity(); return;
      }
      if (intent === "recover" && result?.outcome === "absent" && afterAbandon) { setFrozen(null); afterAbandon(); return; }
      if (intent === "recover" && result?.outcome === "absent") { setError("We couldn't confirm your request. Retry the same request to finish."); return; }
      if (intent === "abandon" && result?.outcome === "abandoned") {
        setFrozen(null); afterAbandon?.(); return;
      }
      publish(result, frozen);
    } catch (e) {
      if (!current()) return;
      if (intent === "recover" || intent === "abandon" || !e.status || e.status >= 500 || e.status === 408 || e.code === "IDEMPOTENCY_CONFLICT") {
        needsLookup = intent === "send";
        setError("We couldn't confirm whether your request was received. Retry this same request."); return;
      }
      if (e.status === 429 && e.retryAfterMs) setSendAfter(Date.now() + e.retryAfterMs);
      if (intent === "retry" && !e.attemptClosed) {
        setError(e.message + " Retry this same request.");
        return;
      }
      if (e.attemptClosed) renewClosedIdentity();
      else setFrozen(null);
      if (e.code === "MANUAL_REVIEW_REQUIRED") setManual(true);
      if (e.code === "PHOTO_REQUIRED") {
        setStep(1); setNotice("Photo upload is working again. Add a photo to send your request."); void refreshBoard();
      } else if (staleCodes.has(e.code) && file && !reattached.current) {
        reattached.current = true; setNotice("Re-attaching photo…"); stopUpload(); setAttach(null); setUploadKey(n => n + 1);
      } else if (["LISTING_NOT_FOUND","REQUEST_ALREADY_EXISTS","TRADE_LISTING_UNAVAILABLE"].includes(e.code)) {
        setUnavailable(true); setError("This dancer is no longer available. Return to the Dance Floor.");
      } else setError(e.retryAfterMs ? e.message + " Check again in " + Math.ceil(e.retryAfterMs / 1000) + " seconds." : e.message);
    } finally {
      if (transport.finish() && needsLookup) void transmit("recover", frozen);
    }
  }
  useEffect(() => {
    if (recovered?.attempt) void transmit("recover", recovered.attempt);
  }, []);
  function send(manualReviewRequested) {
    if (!allowed || lock.current || currentAttempt.current || (mismatch && !manualReviewRequested)) return;
    const frozen = freezeSend({name, family, type, listingId: piece.id, submissionId, uploadId: ready ? attach.ticket.uploadId : null, manualReviewRequested});
    if (ready && Date.now() - Date.parse(attach.ticket.createdAt || attach.ticket.created_at) >= 90 * 60_000 && !reattached.current) {
      savedAt.current = Date.now(); setFrozen(frozen);
      void transmit("recover", frozen, () => {
        reattached.current = true; stopUpload(); setAttach(null); setNotice("Re-attaching photo…"); setUploadKey(n => n + 1);
      }); return;
    }
    savedAt.current = Date.now(); didAttempt.current = true; setFrozen(frozen);
    void transmit("send", frozen);
  }
  function switchPiece(next, handoff = false) {
    const proceed = () => {
      stopUpload(); setAttach(null); setScreen(null); setManual(false); setUnavailable(false); setError(""); setNotice(file ? "Re-attaching photo…" : "");
      setPiece(next); setSubmissionId(crypto.randomUUID()); setStep(1);
      if (handoff) {
        setFamily(""); setType(""); setOther(false); setName(readName(browserStorage("localStorage")) || name.trim());
        setSaved(readName(browserStorage("localStorage"))); setChoosing(false); setReceipt(null); successRef.current = null;
      }
      didAttempt.current = false; usedNewId.current = false; reattached.current = false;
    };
    cancelPassive();
    if (lock.current) return;
    if (currentAttempt.current) void transmit("abandon", currentAttempt.current, proceed);
    else proceed();
  }
  function discard() {
    const leave = () => { stopUpload(); finish(); };
    if (currentAttempt.current) void transmit("abandon", currentAttempt.current, leave);
    else leave();
  }
  function edit(set, value) { set(value); setManual(false); setError(""); }
  function showDetails() { pushHistory(); setStep(2); setNotice(""); }
  const changePhoto = () => goBack();
  const setSelected = e => { const picked = e.target.files?.[0]; e.target.value = ""; if (picked) replaceFile(picked); };
  const accept = /iPhone|iPad|iPod/.test(navigator.userAgent) ? ACCEPT : ACCEPT + ",image/heic,image/heif,.heic,.heif";
  const uncertain = Boolean(attempt);
  const disabled = transport || uncertain;
  const alternatePieces = (activeScreen?.alternatives || []).map(a => board.find(p => p.id === a.listingId) || { id: a.listingId, name: a.designName, collection: a.collectionName, matcherFamily: a.collectionName });
  const sendLabel = mismatch ? "Ask my rep to review anyway" : activeScreen?.failed ? "Send for rep review" : "Send swap request";
  const photoStatus = !online && file && !ready ? "Waiting for signal…" : attach?.label || (file ? "Preparing photo…" : "");
  const needsReview = mismatch || Boolean(activeScreen?.failed);
  return <div className="tp-sheet-mask" onClick={closeIntent}>
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="trade-request-title" tabIndex={-1} className="tp-sheet tp-swap-sheet" onClick={e => e.stopPropagation()}>
      <button type="button" className="tp-sheet-close" aria-label="Close" disabled={transport} onClick={closeIntent}>×</button>
      <div className="tp-sheet-handle"/>
      {confirmClose ? <section><h3 id="trade-request-title" tabIndex={-1} ref={titleRef}>Discard your request?</h3>
        <button type="button" onClick={() => setConfirmClose(false)}>Keep my request</button>
        <button type="button" disabled={transport} onClick={discard}>Discard</button>{error && <p role="alert">{error}</p>}</section>
      : receipt ? <section><h3 id="trade-request-title" className="tp-sheet-success-title" tabIndex={-1} ref={titleRef}>Request sent.</h3>
        <p>{repName} will review this. It is not approved yet.</p>
        {receipt.warning && <p role="alert">{receipt.warning}</p>}
        {receipt.receiptUrl && <div className="tp-sheet-receipt"><strong>Save your private status link</strong>
          <a href={receipt.receiptUrl} rel="noreferrer">View request status</a><button type="button" onClick={async () => {
            try { await navigator.clipboard.writeText(new URL(receipt.receiptUrl, location.origin).href); setCopied(true); } catch { setCopied(false); }
          }}>{copied ? "Copied" : "Copy link"}</button></div>}
        <p>This swap is between you and your rep.</p>
        {file && !choosing && <button type="button" onClick={() => setChoosing(true)}>Request another dancer with this photo</button>}
        {choosing && <div><p>Choose your next dancer.</p>{board.filter(p => p.id !== piece.id).map(p =>
          <button type="button" key={p.id} onClick={() => switchPiece(p, true)}>{p.name}</button>)}</div>}
        <button type="button" onClick={finish}>Done</button></section>
      : <><p className="tp-sheet-eyebrow">Swap request · {step} of 2</p><p className="tp-sheet-piece">{piece.name} · {piece.collection}</p>
        <h3 id="trade-request-title" className="tp-sheet-title" tabIndex={-1} ref={titleRef}>{step === 1 ? "Add a photo of your reveal" : "Your details"}</h3>
        {optional && <p role="status">Photo upload is temporarily unavailable. You can still send a swap request with your name and any details you have.</p>}
        {notice && <p role="status">{notice}</p>}
        {uncertain ? <><p role="status">{transport ? "Checking your request…" : "Your request may already have been received."}</p>
          <button className="tp-sheet-submit" type="button" disabled={transport || Date.now() < sendAfter} onClick={() => void transmit("retry", attempt)}>Retry this same request</button>
          {alternatePieces.map(p => <button type="button" disabled={transport} key={p.id} onClick={() => switchPiece(p)}>{p.name}</button>)}</>
        : <><fieldset disabled={disabled}>
          {step === 1 ? <><p>{optional ? "Optional." : "Required."} Crop out order and personal details.</p><small>Images are kept for 7 days.</small>
            <div className="tp-swap-pickers"><label>Take a photo<input aria-label="Take a photo" type="file" accept={accept} capture="environment" onChange={setSelected}/></label>
            <label>Choose from library<input aria-label="Choose from library" type="file" accept={accept} onChange={setSelected}/></label></div></>
          : <><div className="tp-swap-photo-actions"><button ref={changeRef} type="button" onClick={changePhoto}>Change photo</button>
            {preview && <button ref={thumbRef} aria-label="Preview your photo" type="button" onClick={() => {pushHistory(); setExpanded(true);}}>
              <img src={preview} alt="Your selected reveal" onError={() => {if (urlOwner.current === preview) setPreview(null);}}/></button>}</div>
            <label htmlFor="tp-customer-name">Your name</label>
            <input id="tp-customer-name" value={name} placeholder="Your name" maxLength={100} required autoComplete="name" onChange={e => edit(setName,e.target.value)}/>
            {saved && <button type="button" onClick={() => {clearName(browserStorage("localStorage")); setSaved(""); edit(setName,"");}}>Not you? Clear</button>}
            <small>We'll remember your name on this device.</small>
            <fieldset><legend>What type did you reveal?</legend>{TYPES.map(([value,label]) =>
              <button type="button" key={value} aria-pressed={type === value} onClick={() => edit(setType,type === value ? "" : value)}>{label}</button>)}</fieldset>
            <fieldset><legend>Which collection did you reveal?</legend>{options.map(c =>
              <button type="button" key={c.value} aria-pressed={!other && family === c.value} onClick={() => {setOther(false); edit(setFamily,!other && family === c.value ? "" : c.value);}}>{c.label}</button>)}
              <button type="button" aria-pressed={other} onClick={() => {setOther(!other); edit(setFamily,"");}}>Other</button>
              {other && <input value={family} maxLength={100} aria-label="Other collection" onChange={e => edit(setFamily,e.target.value)}/>}</fieldset>
            <small>Type and collection are optional. Same collection and type. Your rep decides.</small>
            {optional && <small>A photo helps your rep, but you can send without one right now.</small>}
            {mismatch && <p role="status"><strong>These dancers don't appear to match</strong><br/>{activeScreen?.screening?.reason || "The collection or jewelry type differs."} You can choose another dancer or ask your rep to review this one anyway.</p>}
            {activeScreen?.failed && <p>We couldn't check this match right now. You can still send, and your rep will review it.</p>}
            {alternatePieces.map(p => <button type="button" key={p.id} onClick={() => switchPiece(p)}>{p.name}</button>)}
          </>}
          {file && <div aria-live="polite">{photoStatus} <button type="button" onClick={() => replaceFile(null)}>Cancel photo</button>
            {attach?.retry && <button type="button" onClick={() => attach.owner.resume?.()}>Try again</button>}</div>}
          {step === 1 ? <><button className="tp-sheet-submit" type="button" disabled={!file && !optional} onClick={showDetails}>{saved && ready ? "Add details" : "Continue"}</button>
            {saved && <button type="button" disabled={!ready || !allowed} onClick={() => send(needsReview)}>{needsReview ? sendLabel : "Send as " + (name.trim() || saved)}</button>}</>
          : <><button type="button" onClick={goBack}>Back</button><button type="button" className="tp-sheet-submit" disabled={!allowed} onClick={() => send(needsReview)}>{transport ? "Sending…" : sendLabel}</button></>}
        </fieldset></>}
        {error && <p className="tp-sheet-error" role="alert">{error}</p>}
        {unavailable && <button type="button" onClick={discard}>Back to the Dance Floor</button>}
      </>}
      {expanded && preview && <div className="tp-swap-preview" onKeyDown={e => { if (e.key === "Tab") { e.preventDefault(); previewClose.current?.focus(); } }} role="dialog" aria-modal="true" aria-label="Your photo"><button type="button" ref={previewClose} onClick={() => hidePreview()}>Close preview</button>
        <img src={preview} alt="Your selected reveal" onError={() => {if (urlOwner.current === preview) {setPreview(null); hidePreview();}}}/></div>}
    </div></div>;
}
