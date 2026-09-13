"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Camera, CheckCircle2, LoaderCircle, RefreshCw, Sparkles } from "lucide-react";
import {
  initialShowcaseStudioPanelActionState,
  type ShowcaseStudioPanelAction,
  type ShowcaseStudioPanelActionState,
  type ShowcaseStudioVariantCandidate,
} from "@/lib/sparkle-finder/showcase-studio-workflow-types";
import {
  prepareShowcaseStudioImage,
  studioImageAcceptedTypes,
  type PreparedStudioImage,
} from "./showcase-studio-image";

type ShowcaseStudioIntakePanelProps = {
  accountId: string;
  canSubmit: boolean;
  confirmAction?: ShowcaseStudioPanelAction;
  initialState?: ShowcaseStudioPanelActionState;
  isLocalPreview?: boolean;
  retryAction?: ShowcaseStudioPanelAction;
  submitAction?: ShowcaseStudioPanelAction;
};

type ActionChannel = "submit" | "retry" | "confirm";

const submissionStorageKeyPrefix = "sparkle-finder:showcase-studio:submission-id";
const terminalStatuses = new Set<ShowcaseStudioPanelActionState["status"]>([
  "accepted",
  "publish_queued",
  "published",
  "rejected",
  "photo_rejected",
  "invalid_details",
]);
const freshStartStatuses = new Set<ShowcaseStudioPanelActionState["status"]>([
  "error",
  "invalid_details",
  "invalid_selection",
  "photo_rejected",
  "rejected",
]);

export function ShowcaseStudioIntakePanel({
  accountId,
  canSubmit,
  confirmAction,
  initialState = initialShowcaseStudioPanelActionState,
  isLocalPreview = false,
  retryAction,
  submitAction,
}: ShowcaseStudioIntakePanelProps) {
  const [submissionId, setSubmissionId] = useState(initialState.submissionId ?? "");
  const [activeChannel, setActiveChannel] = useState<ActionChannel>("submit");
  const [preparationMessage, setPreparationMessage] = useState("");
  const [freshSubmissionReady, setFreshSubmissionReady] = useState(false);

  const [submitState, submitFormAction, isSubmitPending] = useActionState<ShowcaseStudioPanelActionState, FormData>(
    async (previousState, formData): Promise<ShowcaseStudioPanelActionState> => {
      setActiveChannel("submit");
      setPreparationMessage("Preparing both photos without cropping them…");
      try {
        const [labelPhoto, jewelryPhoto] = await Promise.all([
          prepareRequiredImage(formData.get("originalLabelPhoto"), "Original label photo"),
          prepareRequiredImage(formData.get("jewelryFrontPhoto"), "Jewelry photo"),
        ]);
        formData.set("originalLabelPhoto", labelPhoto.file);
        formData.set("jewelryFrontPhoto", jewelryPhoto.file);
        formData.set("finderSubmissionId", submissionId);
        setPreparationMessage(formatPreparedImages(labelPhoto, jewelryPhoto));

        return submitAction
          ? submitAction(previousState, formData)
          : unavailableState(previousState, isLocalPreview);
      } catch (error) {
        const message = error instanceof Error ? error.message : "The photos could not be prepared.";
        setPreparationMessage(message);
        return { ...previousState, status: "photo_rejected", message, retryable: false };
      }
    },
    initialState,
  );
  const [retryState, retryFormAction, isRetryPending] = useActionState<ShowcaseStudioPanelActionState, FormData>(
    async (previousState, formData): Promise<ShowcaseStudioPanelActionState> => {
      setActiveChannel("retry");
      formData.set("finderSubmissionId", submissionId);
      return retryAction
        ? retryAction(previousState, formData)
        : unavailableState(previousState, isLocalPreview);
    },
    initialState,
  );
  const [confirmState, confirmFormAction, isConfirmPending] = useActionState<ShowcaseStudioPanelActionState, FormData>(
    async (previousState, formData): Promise<ShowcaseStudioPanelActionState> => {
      setActiveChannel("confirm");
      formData.set("finderSubmissionId", submissionId);
      return confirmAction
        ? confirmAction(previousState, formData)
        : unavailableState(previousState, isLocalPreview);
    },
    initialState,
  );

  const activeState = activeChannel === "retry"
    ? retryState
    : activeChannel === "confirm"
      ? confirmState
      : submitState;
  const visibleState = freshSubmissionReady
    ? {
        ...initialShowcaseStudioPanelActionState,
        message: preparationMessage || "A fresh Studio request is ready. Your selected photos have not been sent yet.",
        submissionId,
      }
    : activeState;
  const candidates = visibleState.candidates.length > 0
    ? visibleState.candidates
    : submitState.candidates;
  const isPending = isSubmitPending || isRetryPending || isConfirmPending;
  const submissionStorageKey = useMemo(
    () => `${submissionStorageKeyPrefix}:${accountId.trim() || "preview"}`,
    [accountId],
  );
  const activeStorageKeyRef = useRef(submissionStorageKey);
  const previousSubmitStateRef = useRef(submitState);

  useEffect(() => {
    if (previousSubmitStateRef.current === submitState) return;
    previousSubmitStateRef.current = submitState;
    window.queueMicrotask(() => setFreshSubmissionReady(false));
  }, [submitState]);

  useEffect(() => {
    if (activeStorageKeyRef.current !== submissionStorageKey) {
      activeStorageKeyRef.current = submissionStorageKey;
      const stored = window.localStorage.getItem(submissionStorageKey);
      const initialSubmissionId = initialState.submissionId;
      const nextId = isSubmissionId(initialSubmissionId)
        ? initialSubmissionId
        : isSubmissionId(stored)
          ? stored
          : createSubmissionId();
      window.localStorage.setItem(submissionStorageKey, nextId);
      window.queueMicrotask(() => {
        setSubmissionId(nextId);
        setFreshSubmissionReady(false);
        setActiveChannel("submit");
        setPreparationMessage("");
      });
      return;
    }
    if (submissionId) {
      window.localStorage.setItem(submissionStorageKey, submissionId);
      return;
    }
    const stored = window.localStorage.getItem(submissionStorageKey);
    const nextId = isSubmissionId(stored) ? stored : createSubmissionId();
    window.localStorage.setItem(submissionStorageKey, nextId);
    window.queueMicrotask(() => setSubmissionId(nextId));
  }, [initialState.submissionId, submissionId, submissionStorageKey]);

  useEffect(() => {
    if (!terminalStatuses.has(activeState.status)) return;
    window.localStorage.removeItem(submissionStorageKey);
    window.queueMicrotask(() => {
      setSubmissionId("");
      setFreshSubmissionReady(false);
    });
  }, [activeState.status, submissionStorageKey]);

  const statusTone = useMemo(() => {
    if (visibleState.status === "published" || visibleState.status === "accepted" || visibleState.status === "publish_queued") {
      return "border-[rgba(34,139,94,0.3)] bg-[#f0fbf5] text-[#176b49]";
    }
    if (visibleState.status === "idle") {
      return "border-[var(--sparkle-border)] bg-white text-[var(--sparkle-ink-muted)]";
    }
    return "border-[rgba(238,44,155,0.25)] bg-[var(--sparkle-blush-bg)] text-[var(--sparkle-plum-deep)]";
  }, [visibleState.status]);

  function startFreshSubmission() {
    const nextId = createSubmissionId();
    window.localStorage.setItem(submissionStorageKey, nextId);
    setSubmissionId(nextId);
    setFreshSubmissionReady(true);
    setActiveChannel("submit");
    setPreparationMessage("A fresh Studio request is ready. Your selected photos have not been sent yet.");
  }

  return (
    <section
      className="scroll-mt-24 overflow-hidden rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-[var(--sparkle-paper)] shadow-[var(--sparkle-shadow-sm)]"
      data-smoke="showcase-studio-intake"
      id="showcase-studio"
    >
      <div className="border-b border-[var(--sparkle-border)] bg-[linear-gradient(135deg,#fff8fb_0%,#fffef8_100%)] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-white text-[var(--sparkle-coral)]">
            <Camera aria-hidden="true" className="size-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sparkle-coral)]">Missing from the library?</p>
            <h2 className="mt-1 font-[family-name:var(--font-playfair)] text-2xl font-semibold text-[var(--sparkle-plum-deep)]">Showcase Studio</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--sparkle-ink-muted)]">
              Send the full original label and a clear jewelry photo. Nic-Nac keeps same-number stone and material variants attached to their exact designs.
            </p>
          </div>
        </div>
      </div>

      <form action={submitFormAction} className="grid gap-5 p-5 sm:p-6">
        <input name="finderSubmissionId" type="hidden" value={submissionId} />
        <div className="grid gap-4 sm:grid-cols-2">
          <PhotoInput
            help="Keep every label edge, item number, and printed detail visible."
            label="Original label photo"
            name="originalLabelPhoto"
          />
          <PhotoInput
            help="Show the full piece, stone color, and metal finish in even light."
            label="Jewelry photo"
            name="jewelryFrontPhoto"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField help="Enter it exactly as printed, for example RBP5902." label="Item number" maxLength={80} name="itemNumber" required />
          <TextField help="Optional — use the wording printed on the label." label="Main stone" maxLength={120} name="mainStone" />
          <TextField help="Optional — for example rose gold or rhodium." label="Material" maxLength={120} name="material" />
          <label className="grid gap-2 text-sm font-bold text-[var(--sparkle-plum-deep)] sm:col-span-2">
            Is this piece a diamond or unicorn?
            <select
              className="rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border-strong)] bg-white px-3 py-3 text-base font-medium text-[var(--sparkle-ink)] outline-none transition focus:border-[var(--sparkle-plum)] focus:ring-2 focus:ring-[rgba(123,47,135,0.16)]"
              defaultValue="standard"
              name="rarityClassification"
              required
            >
              <option value="standard">No — standard piece</option>
              <option value="diamond">Diamond</option>
              <option value="unicorn">Unicorn</option>
            </select>
            <span className="font-medium text-[var(--sparkle-ink-muted)]">
              Choose Diamond or Unicorn only when that is the piece’s actual Bomb Party classification.
            </span>
          </label>
          <label className="grid gap-2 text-sm font-bold text-[var(--sparkle-plum-deep)] sm:col-span-2">
            Note for Nic-Nac <span className="font-medium text-[var(--sparkle-ink-muted)]">(optional)</span>
            <textarea
              className="min-h-28 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border-strong)] bg-white px-3 py-3 text-base font-medium text-[var(--sparkle-ink)] outline-none transition focus:border-[var(--sparkle-plum)] focus:ring-2 focus:ring-[rgba(123,47,135,0.16)]"
              maxLength={500}
              name="customerNote"
              placeholder="Collection, year, reveal memory, or another detail from the package."
            />
          </label>
        </div>

        <button
          aria-busy={isSubmitPending}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--sparkle-radius-sm)] bg-[var(--sparkle-plum)] px-5 py-3 text-sm font-bold text-white transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55 sm:w-fit"
          disabled={!canSubmit || !submitAction || !submissionId || isPending || freshStartStatuses.has(visibleState.status)}
          type="submit"
        >
          {isSubmitPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Sparkles aria-hidden="true" className="size-4" />}
          {isSubmitPending ? "Preparing and sending…" : "Send to Showcase Studio"}
        </button>
        <p aria-live="polite" className="text-sm font-semibold text-[var(--sparkle-ink-muted)]">
          {preparationMessage || "Photos are resized without a square crop before they leave your browser."}
        </p>
      </form>

      <div className={`mx-5 mb-5 rounded-[var(--sparkle-radius-sm)] border px-4 py-3 text-sm font-semibold leading-6 sm:mx-6 sm:mb-6 ${statusTone}`} aria-live="polite" role="status">
        {isLocalPreview && !submitAction
          ? "Local preview shows the complete Studio form. Saving requires a signed-in Silver account."
          : visibleState.message}
      </div>

      {freshStartStatuses.has(visibleState.status) ? (
        <div className="mx-5 mb-5 sm:mx-6 sm:mb-6">
          <button
            className="inline-flex min-h-11 w-full items-center justify-center rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-plum)] bg-white px-4 text-sm font-bold text-[var(--sparkle-plum)] sm:w-fit"
            onClick={startFreshSubmission}
            type="button"
          >
            Start a fresh Studio request
          </button>
        </div>
      ) : null}

      {visibleState.retryable && visibleState.submissionId ? (
        <form action={retryFormAction} className="mx-5 mb-5 sm:mx-6 sm:mb-6">
          <input name="finderSubmissionId" type="hidden" value={visibleState.submissionId} />
          <button
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-plum)] bg-white px-4 text-sm font-bold text-[var(--sparkle-plum)] disabled:opacity-55 sm:w-fit"
            disabled={!retryAction || isPending}
            type="submit"
          >
            {isRetryPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <RefreshCw aria-hidden="true" className="size-4" />}
            Retry saved request
          </button>
        </form>
      ) : null}

      {visibleState.status === "needs_confirmation" && candidates.length > 0 ? (
        <CandidateConfirmation
          action={confirmFormAction}
          candidates={candidates}
          disabled={!confirmAction || isPending}
          isPending={isConfirmPending}
          submissionId={visibleState.submissionId ?? submissionId}
        />
      ) : null}

      {visibleState.selectedDesign ? (
        <div className="mx-5 mb-5 flex items-start gap-3 rounded-[var(--sparkle-radius-sm)] border border-[rgba(34,139,94,0.3)] bg-[#f0fbf5] p-4 text-sm text-[#176b49] sm:mx-6 sm:mb-6">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <p><strong>{visibleState.selectedDesign.designName}</strong> is attached as exact design <span className="font-mono">{visibleState.selectedDesign.designId}</span>.</p>
        </div>
      ) : null}
    </section>
  );
}

function PhotoInput({ help, label, name }: { help: string; label: string; name: string }) {
  const helpId = `${name}-help`;
  return (
    <label className="grid gap-2 rounded-[var(--sparkle-radius-sm)] border border-dashed border-[var(--sparkle-border-strong)] bg-[var(--sparkle-blush-bg)] p-4 text-sm font-bold text-[var(--sparkle-plum-deep)]">
      {label}
      <input
        accept={studioImageAcceptedTypes.join(",")}
        aria-describedby={helpId}
        className="min-h-11 w-full rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-white px-3 py-2 text-sm font-semibold file:mr-3 file:min-h-9 file:rounded-lg file:border-0 file:bg-[var(--sparkle-plum)] file:px-3 file:text-sm file:font-bold file:text-white"
        name={name}
        required
        type="file"
      />
      <span className="font-medium leading-5 text-[var(--sparkle-ink-muted)]" id={helpId}>{help}</span>
    </label>
  );
}

function TextField({ help, label, ...inputProps }: { help: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const helpId = `${String(inputProps.name)}-help`;
  return (
    <label className="grid gap-2 text-sm font-bold text-[var(--sparkle-plum-deep)]">
      {label}
      <input
        {...inputProps}
        aria-describedby={helpId}
        className="min-h-11 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border-strong)] bg-white px-3 text-base font-semibold text-[var(--sparkle-ink)] outline-none transition focus:border-[var(--sparkle-plum)] focus:ring-2 focus:ring-[rgba(123,47,135,0.16)]"
        type="text"
      />
      <span className="font-medium leading-5 text-[var(--sparkle-ink-muted)]" id={helpId}>{help}</span>
    </label>
  );
}

function CandidateConfirmation({
  action,
  candidates,
  disabled,
  isPending,
  submissionId,
}: {
  action: (payload: FormData) => void;
  candidates: ShowcaseStudioVariantCandidate[];
  disabled: boolean;
  isPending: boolean;
  submissionId: string;
}) {
  return (
    <form action={action} className="border-t border-[var(--sparkle-border)] p-5 sm:p-6">
      <input name="finderSubmissionId" type="hidden" value={submissionId} />
      <fieldset className="grid gap-4">
        <legend className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-[var(--sparkle-plum-deep)]">Choose the exact design</legend>
        <p className="text-sm leading-6 text-[var(--sparkle-ink-muted)]">Compare the stone, material, and canonical photo. No option is selected for you.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {candidates.map((candidate) => <CandidateCard candidate={candidate} key={candidate.designId} />)}
        </div>
      </fieldset>
      <button
        aria-busy={isPending}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--sparkle-radius-sm)] bg-[var(--sparkle-plum)] px-5 text-sm font-bold text-white disabled:opacity-55 sm:w-fit"
        disabled={disabled}
        type="submit"
      >
        {isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <CheckCircle2 aria-hidden="true" className="size-4" />}
        Confirm exact design
      </button>
    </form>
  );
}

function CandidateCard({ candidate }: { candidate: ShowcaseStudioVariantCandidate }) {
  return (
    <label className="grid cursor-pointer gap-3 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-white p-3 has-[:checked]:border-[var(--sparkle-plum)] has-[:checked]:ring-2 has-[:checked]:ring-[rgba(123,47,135,0.16)]">
      <input className="size-5 accent-[var(--sparkle-plum)]" name="selectedDesignId" required type="radio" value={candidate.designId} />
      {candidate.canonicalPhotoUrl ? (
        <div
          aria-label={`Canonical photo for ${candidate.designName}`}
          className="aspect-[4/3] w-full rounded-lg bg-[#f8f4f7] bg-contain bg-center bg-no-repeat"
          data-design-id={candidate.designId}
          data-photo-role="canonical"
          role="img"
          style={{ backgroundImage: `url("${candidate.canonicalPhotoUrl}")` }}
        />
      ) : null}
      <div>
        <p className="font-bold text-[var(--sparkle-plum-deep)]">{candidate.designName}</p>
        <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--sparkle-coral)]">{candidate.itemNumber}</p>
        <p className="mt-2 text-sm text-[var(--sparkle-ink-muted)]">{formatCandidateFacts(candidate)}</p>
        {candidate.description ? <p className="mt-2 text-sm leading-5 text-[var(--sparkle-ink-muted)]">{candidate.description}</p> : null}
        <p className="mt-2 break-all font-mono text-xs text-[var(--sparkle-ink-muted)]">Design ID: {candidate.designId}</p>
      </div>
    </label>
  );
}

async function prepareRequiredImage(value: FormDataEntryValue | null, label: string): Promise<PreparedStudioImage> {
  if (!(value instanceof File) || value.size === 0) {
    throw new Error(`${label} is required.`);
  }
  try {
    return await prepareShowcaseStudioImage(value);
  } catch (error) {
    throw new Error(`${label}: ${error instanceof Error ? error.message : "could not be prepared."}`);
  }
}

function formatPreparedImages(label: PreparedStudioImage, jewelry: PreparedStudioImage): string {
  return `Photos prepared without cropping: label ${label.width}×${label.height}, jewelry ${jewelry.width}×${jewelry.height}.`;
}

function formatCandidateFacts(candidate: ShowcaseStudioVariantCandidate): string {
  return [
    candidate.mainStone,
    candidate.material,
    candidate.collectionName,
    candidate.collectionYear,
    candidate.jewelryType,
  ].filter(Boolean).join(" · ") || "Variant details unavailable";
}

function unavailableState(
  previousState: ShowcaseStudioPanelActionState,
  isLocalPreview: boolean,
): ShowcaseStudioPanelActionState {
  return {
    ...previousState,
    status: "error",
    message: isLocalPreview
      ? "Local preview cannot save Studio requests."
      : "Showcase Studio is temporarily unavailable. Please try again.",
    retryable: !isLocalPreview,
  };
}

function createSubmissionId(): string {
  return window.crypto.randomUUID();
}

function isSubmissionId(value: string | null): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}
