"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ExternalLink, Eye, EyeOff, FolderHeart, LoaderCircle, Save, Sparkles, Trash2 } from "lucide-react";
import type { SilverSaveActionState } from "@/app/(hub)/silver/actions";
import type { ManagedCollectionItem } from "@/components/silver/CollectionManager";
import { JewelryImageFrame } from "@/components/library/JewelryImageFrame";
import type { ShowcaseCollection } from "@/lib/sparkle-finder/showcase-types";
import type { SparkleShowcaseItemStatus } from "@/lib/sparkle-finder/showcase-types";
import { canSelectRarestReveal } from "@/lib/sparkle-finder/showcase-rarity";

export type ShowcaseOwnerData = {
  handle: string;
  tagline: string;
  visibility: "private" | "public";
  collections: ShowcaseCollection[];
};

type OwnerAction = (previousState: SilverSaveActionState, formData: FormData) => Promise<SilverSaveActionState>;

type ShowcaseOwnerPanelProps = {
  canSave: boolean;
  canSavePieces?: boolean;
  collectionItems: ManagedCollectionItem[];
  data: ShowcaseOwnerData;
  isLocalPreview: boolean;
  savePieceAction?: OwnerAction;
  saveProfileAction?: OwnerAction;
  saveCollectionAction?: OwnerAction;
  deleteCollectionAction?: OwnerAction;
  assignPieceAction?: OwnerAction;
};

const initialState: SilverSaveActionState = { status: "idle", message: "Showcase controls ready." };

export function ShowcaseOwnerPanel({
  canSave,
  canSavePieces,
  collectionItems,
  data,
  isLocalPreview,
  savePieceAction,
  saveProfileAction,
  saveCollectionAction,
  deleteCollectionAction,
  assignPieceAction,
}: ShowcaseOwnerPanelProps) {
  const [profileState, profileFormAction, profilePending] = useActionState(saveProfileAction ?? disabledAction, initialState);
  const [collectionState, collectionFormAction, collectionPending] = useActionState(saveCollectionAction ?? disabledAction, initialState);
  const [deleteState, deleteFormAction, deletePending] = useActionState(deleteCollectionAction ?? disabledAction, initialState);
  const [pieceState, pieceFormAction, piecePending] = useActionState(savePieceAction ?? disabledAction, initialState);
  const [assignmentState, assignmentFormAction, assignmentPending] = useActionState(assignPieceAction ?? disabledAction, initialState);
  const [handleDraft, setHandleDraft] = useState(data.handle);
  const disabled = !canSave || isLocalPreview;
  const piecesDisabled = !(canSavePieces ?? canSave) || isLocalPreview;
  const publicUrl = data.handle ? `/showcase/${data.handle}` : "";
  const handlePreview = normalizeHandlePreview(handleDraft) || "your-name";

  return (
    <section className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5" aria-labelledby="manage-showcase-heading" data-smoke="showcase-owner-panel">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sparkle-coral)]">Public Showcase controls</p>
        <h2 id="manage-showcase-heading" className="mt-1 font-[family-name:var(--font-playfair)] text-3xl font-semibold text-[var(--sparkle-plum-deep)]">
          Tell the story of your collection
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--sparkle-ink-muted)]">
          Nothing becomes public automatically. Choose your public pieces, add reveal stories, and publish only when you are ready.
        </p>
      </div>

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <form action={profileFormAction} className="grid gap-4 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-[var(--sparkle-paper)] p-5 shadow-[var(--sparkle-shadow-sm)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-bold text-[var(--sparkle-plum-deep)]">Showcase setup</p>
              <p className="mt-1 text-sm leading-5 text-[var(--sparkle-ink-muted)]">Choose a public address, tagline, and privacy setting.</p>
            </div>
            {data.visibility === "public" ? <Eye aria-hidden="true" className="size-5 text-[var(--sparkle-plum)]" /> : <EyeOff aria-hidden="true" className="size-5 text-[var(--sparkle-ink-muted)]" />}
          </div>
          <label className="grid gap-1 text-sm font-bold text-[var(--sparkle-plum-deep)]">
            Showcase handle
            <input
              aria-describedby="showcase-handle-help showcase-handle-preview"
              autoCapitalize="none"
              autoComplete="off"
              className="min-h-11 w-full rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-white px-3 font-normal outline-none focus:ring-2 focus:ring-[var(--sparkle-plum)]"
              maxLength={40}
              name="handle"
              onChange={(event) => setHandleDraft(event.target.value)}
              placeholder="your-name"
              required
              spellCheck={false}
              value={handleDraft}
            />
          </label>
          <p className="text-xs leading-5 text-[var(--sparkle-ink-muted)]" id="showcase-handle-help">
            Use lowercase letters, numbers, and hyphens. We will clean up spaces for you.
          </p>
          <p className="break-words rounded-[var(--sparkle-radius-sm)] bg-[var(--sparkle-paper-soft)] px-3 py-2 text-xs font-semibold text-[var(--sparkle-ink-muted)]" id="showcase-handle-preview">
            Your address: yoursparklefinder.com/showcase/<span className="text-[var(--sparkle-plum-deep)]">{handlePreview}</span>
          </p>
          <label className="grid gap-1 text-sm font-bold text-[var(--sparkle-plum-deep)]">
            Short tagline
            <textarea className="min-h-24 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-white p-3 font-normal" defaultValue={data.tagline} maxLength={160} name="tagline" placeholder="What makes your collection sparkle?" />
          </label>
          <fieldset className="grid grid-cols-2 gap-2">
            <legend className="mb-2 text-sm font-bold text-[var(--sparkle-plum-deep)]">Who can see it?</legend>
            <VisibilityChoice defaultChecked={data.visibility !== "public"} icon={<EyeOff aria-hidden="true" className="size-4" />} label="Keep private" value="private" />
            <VisibilityChoice defaultChecked={data.visibility === "public"} icon={<Eye aria-hidden="true" className="size-4" />} label="Make public" value="public" />
          </fieldset>
          <div className="flex flex-wrap gap-2">
            <SubmitButton disabled={disabled} pending={profilePending}>Save Showcase</SubmitButton>
            {publicUrl ? (
              <Link className="inline-flex min-h-11 items-center gap-2 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] px-4 text-sm font-bold text-[var(--sparkle-plum)]" href={publicUrl}>
                <ExternalLink aria-hidden="true" className="size-4" /> {data.visibility === "public" ? "Preview" : "Private Preview"}
              </Link>
            ) : null}
          </div>
          <ActionStatus state={profileState} />
        </form>

        <div className="grid content-start gap-4 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-[var(--sparkle-paper)] p-5 shadow-[var(--sparkle-shadow-sm)]">
          <div>
            <p className="font-bold text-[var(--sparkle-plum-deep)]">Start a Showcase Collection</p>
            <p className="mt-1 text-sm leading-5 text-[var(--sparkle-ink-muted)]">Group favorites into visual stories such as “Purple Dreams” or “Never Leaving.”</p>
          </div>
          <CollectionForm action={collectionFormAction} disabled={disabled} pending={collectionPending} />
          <ActionStatus state={collectionState} />
        </div>
      </div>

      {data.collections.length > 0 ? (
        <div className="grid gap-3">
          <p className="text-sm leading-6 text-[var(--sparkle-ink-muted)]">
            Removing a Showcase Collection never removes its jewelry from your collection.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {data.collections.map((collection) => (
              <article className="grid gap-3 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-[var(--sparkle-paper)] p-4" key={collection.id}>
                <CollectionForm action={collectionFormAction} collection={collection} disabled={disabled} pending={collectionPending} />
                <div className="grid gap-2 text-sm text-[var(--sparkle-ink-muted)]">
                  <span>{collection.pieceIds.length} {collection.pieceIds.length === 1 ? "piece" : "pieces"}</span>
                  <DeleteCollectionControl
                    action={deleteFormAction}
                    collection={collection}
                    disabled={disabled}
                    pending={deletePending}
                  />
                </div>
              </article>
            ))}
          </div>
          <ActionStatus state={deleteState} />
        </div>
      ) : null}

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3">
        <div>
          <p className="font-bold text-[var(--sparkle-plum-deep)]">Piece stories and visibility</p>
          <p className="mt-1 text-sm leading-5 text-[var(--sparkle-ink-muted)]">Open only the piece you want to edit. Private notes are never included in the public Showcase.</p>
          {piecesDisabled && !disabled ? (
            <p className="mt-2 text-sm font-semibold text-[var(--sparkle-ink-muted)]">Silver is required to save a collection.</p>
          ) : null}
        </div>
        {collectionItems.length === 0 ? (
          <p className="rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-[var(--sparkle-paper)] p-5 text-sm text-[var(--sparkle-ink-muted)]">Add an owned piece or Wishlist item first, then return here to shape its Showcase story.</p>
        ) : (
          collectionItems.map((item) => (
            <PieceEditorDetails
              assignmentAction={assignmentFormAction}
              assignmentPending={assignmentPending}
              collections={data.collections}
              disabled={disabled}
              item={item}
              piecesDisabled={piecesDisabled}
              key={item.id}
              pieceAction={pieceFormAction}
              piecePending={piecePending}
              pieceState={pieceState}
            />
          ))
        )}
        <ActionStatus state={assignmentState} />
      </div>
    </section>
  );
}

function DeleteCollectionControl({
  action,
  collection,
  disabled,
  pending,
}: {
  action: (formData: FormData) => void;
  collection: ShowcaseCollection;
  disabled: boolean;
  pending: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const confirmationId = useId();
  const confirmationTitleId = useId();
  const confirmationDescriptionId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef(false);

  useEffect(() => {
    if (confirming) {
      restoreFocusRef.current = true;
      confirmButtonRef.current?.focus();
      return;
    }
    if (restoreFocusRef.current) {
      restoreFocusRef.current = false;
      triggerRef.current?.focus();
    }
  }, [confirming]);

  if (!confirming) {
    return (
      <button
        aria-controls={confirmationId}
        aria-expanded="false"
        className="inline-flex min-h-11 w-fit items-center gap-1 px-2 font-bold text-[var(--sparkle-coral)] disabled:opacity-50"
        disabled={disabled || pending}
        onClick={() => setConfirming(true)}
        ref={triggerRef}
        type="button"
      >
        <Trash2 aria-hidden="true" className="size-4" /> Remove collection
      </button>
    );
  }

  return (
    <div
      aria-describedby={confirmationDescriptionId}
      aria-labelledby={confirmationTitleId}
      className="grid gap-3 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-[var(--sparkle-blush-bg)] p-3"
      id={confirmationId}
      role="alertdialog"
    >
      <p className="font-bold text-[var(--sparkle-plum-deep)]" id={confirmationTitleId}>Remove “{collection.title}”?</p>
      <p className="text-sm leading-6 text-[var(--sparkle-ink-muted)]" id={confirmationDescriptionId}>
        This removes only the Showcase Collection. Every piece stays safely in your collection.
      </p>
      <div className="flex flex-wrap gap-2">
        <form action={action}>
          <input name="collectionId" type="hidden" value={collection.id} />
          <button
            aria-busy={pending}
            className="inline-flex min-h-11 items-center gap-2 rounded-[var(--sparkle-radius-sm)] bg-[var(--sparkle-coral)] px-4 text-sm font-bold text-white disabled:opacity-50"
            disabled={disabled || pending}
            ref={confirmButtonRef}
            type="submit"
          >
            {pending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Trash2 aria-hidden="true" className="size-4" />}
            Yes, remove collection
          </button>
        </form>
        <button
          className="min-h-11 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-white px-4 text-sm font-bold text-[var(--sparkle-plum)]"
          disabled={pending}
          onClick={() => setConfirming(false)}
          type="button"
        >
          Keep collection
        </button>
      </div>
    </div>
  );
}

function PieceEditorDetails({
  assignmentAction,
  assignmentPending,
  collections,
  disabled,
  item,
  pieceAction,
  piecePending,
  pieceState,
  piecesDisabled,
}: {
  assignmentAction: (formData: FormData) => void;
  assignmentPending: boolean;
  collections: ShowcaseCollection[];
  disabled: boolean;
  item: ManagedCollectionItem;
  pieceAction: (formData: FormData) => void;
  piecePending: boolean;
  pieceState: SilverSaveActionState;
  piecesDisabled: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();

  return (
    <details
      className="group min-w-0 scroll-mt-24 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-[var(--sparkle-paper)]"
      onToggle={(event) => setExpanded(event.currentTarget.open)}
    >
      <summary
        aria-controls={contentId}
        aria-expanded={expanded}
        className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-[var(--sparkle-radius-sm)] p-4 font-bold text-[var(--sparkle-plum-deep)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sparkle-plum)]"
      >
        <span className="min-w-0">
          <span className="block truncate">{item.jewelryItem.name}</span>
          <span className="mt-1 block text-xs font-semibold text-[var(--sparkle-ink-muted)]">Edit piece details</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-[var(--sparkle-blush-bg)] px-2.5 py-1 text-xs text-[var(--sparkle-ink-muted)]">{item.visibility === "public" ? "Public" : "Private"}</span>
          <ChevronDown aria-hidden="true" className="size-5 transition-transform group-open:rotate-180" />
        </span>
      </summary>
      <div className="grid gap-4 border-t border-[var(--sparkle-border)] p-4 lg:grid-cols-2" id={contentId}>
        <PieceStoryForm action={pieceAction} disabled={piecesDisabled} item={item} pending={piecePending} state={pieceState} />
        <CollectionMembership
          action={assignmentAction}
          collections={collections}
          disabled={disabled}
          item={item}
          pending={assignmentPending}
        />
      </div>
    </details>
  );
}

function PieceStoryForm({
  action,
  disabled,
  item,
  pending,
  state,
}: {
  action: (formData: FormData) => void;
  disabled: boolean;
  item: ManagedCollectionItem;
  pending: boolean;
  state: SilverSaveActionState;
}) {
  const initialStatus = item.showcaseStatus ?? (item.state === "wishlist" ? "wishlist" : "owned");
  const [status, setStatus] = useState<SparkleShowcaseItemStatus>(initialStatus);
  const canMarkRarest = canSelectRarestReveal(status);
  const isAutomaticRarestReveal = canMarkRarest && (
    item.jewelryItem.bpLabel === "diamond" || item.jewelryItem.bpLabel === "unicorn"
  );
  const [photoResetKey, setPhotoResetKey] = useState(0);
  const [showActionStatus, setShowActionStatus] = useState(false);
  const submittedRef = useRef(false);
  const observedPendingRef = useRef(false);

  useEffect(() => {
    if (!submittedRef.current) return;
    if (pending) {
      observedPendingRef.current = true;
      return;
    }
    if (!observedPendingRef.current) return;

    submittedRef.current = false;
    observedPendingRef.current = false;
    setPhotoResetKey((value) => value + 1);
    setShowActionStatus(true);
  }, [pending]);

  return (
    <form
      action={action}
      className="grid min-w-0 gap-3"
      onSubmit={() => {
        submittedRef.current = true;
        setShowActionStatus(false);
      }}
    >
      <input name="jewelryItemId" type="hidden" value={item.jewelryItemId} />
      <input name="note" type="hidden" value={item.note} />
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <label className="grid min-w-0 gap-1 text-sm font-bold">Status
          <select
            className="min-h-11 min-w-0 w-full rounded border border-[var(--sparkle-border)] bg-white px-3 font-normal"
            name="showcaseStatus"
            onChange={(event) => setStatus(event.target.value as SparkleShowcaseItemStatus)}
            value={status}
          >
            <option value="owned">Owned</option><option value="wishlist">Wishlist</option><option value="iso">Looking for</option><option value="private_note_only">Private note only</option>
          </select>
        </label>
        <label className="grid min-w-0 gap-1 text-sm font-bold">Visibility
          <select className="min-h-11 min-w-0 w-full rounded border border-[var(--sparkle-border)] bg-white px-3 font-normal" defaultValue={item.visibility ?? "private"} name="visibility">
            <option value="private">Private</option><option value="public">Public</option>
          </select>
        </label>
      </div>
      <label className="grid gap-1 text-sm font-bold">Showcase story
        <textarea className="min-h-28 rounded border border-[var(--sparkle-border)] bg-white p-3 font-normal" defaultValue={item.revealStory ?? ""} maxLength={700} name="revealStory" placeholder="Tell the true story of this piece in your own words." />
      </label>
      <PiecePhotoField item={item} key={`${item.id}-${photoResetKey}`} />
      {isAutomaticRarestReveal ? (
        <p className="text-sm leading-6 text-[var(--sparkle-ink-muted)]">
          This {item.jewelryItem.bpLabel === "diamond" ? "Diamond" : "Unicorn"} is automatically featured in The Rarest of Reveals while it is owned.
        </p>
      ) : canMarkRarest ? (
        <label className="flex min-h-11 items-center gap-2 text-sm font-bold">
          <input defaultChecked={item.isRarestReveal === true} name="isRarestReveal" type="checkbox" value="yes" /> Mark as a Rarest Reveal
        </label>
      ) : (
        <p className="text-sm leading-6 text-[var(--sparkle-ink-muted)]">
          Wishlist and Looking for pieces stay in your Showcase, but only owned pieces can be Rarest Reveals.
        </p>
      )}
      <SubmitButton disabled={disabled} pending={pending}>Save piece story</SubmitButton>
      {showActionStatus ? <ActionStatus state={state} /> : null}
    </form>
  );
}

function PiecePhotoField({ item }: { item: ManagedCollectionItem }) {
  const initialPersonalPhotoUrl = item.personalPhotoUrl?.trim() ?? "";
  const catalogPhotoUrl = item.jewelryItem.imageUrl;
  const [previewUrl, setPreviewUrl] = useState(initialPersonalPhotoUrl || catalogPhotoUrl);
  const [showingPersonalPhoto, setShowingPersonalPhoto] = useState(Boolean(initialPersonalPhotoUrl));
  const [removePersonalPhoto, setRemovePersonalPhoto] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const helpId = useId();

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  function clearObjectUrl() {
    if (!objectUrlRef.current) return;
    URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
  }

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    clearObjectUrl();
    const file = event.target.files?.[0];

    if (!file) {
      setPreviewUrl(initialPersonalPhotoUrl || catalogPhotoUrl);
      setShowingPersonalPhoto(Boolean(initialPersonalPhotoUrl));
      setRemovePersonalPhoto(false);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    setPreviewUrl(objectUrl);
    setShowingPersonalPhoto(true);
    setRemovePersonalPhoto(false);
  }

  function useCatalogPhoto() {
    clearObjectUrl();
    if (inputRef.current) inputRef.current.value = "";
    setPreviewUrl(catalogPhotoUrl);
    setShowingPersonalPhoto(false);
    setRemovePersonalPhoto(Boolean(initialPersonalPhotoUrl));
  }

  return (
    <fieldset className="grid gap-3 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-[var(--sparkle-paper-soft)] p-3">
      <legend className="px-1 text-sm font-bold">Personal piece photo</legend>
      <div className="grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-start">
        <div className="aspect-square min-h-28 overflow-hidden rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-white">
          <JewelryImageFrame
            imageUrl={previewUrl}
            jewelryType={item.jewelryItem.jewelryType}
            name={`${item.jewelryItem.name} ${showingPersonalPhoto ? "personal photo preview" : "catalog image preview"}`}
          />
        </div>
        <div className="grid gap-2">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--sparkle-coral)]">
            {showingPersonalPhoto ? "Your photo" : "Catalog image"}
          </p>
          <label className="grid gap-1 text-sm font-bold">
            {showingPersonalPhoto ? "Replace photo" : "Add your own photo"}
            <input
              accept="image/jpeg,image/png,image/webp"
              aria-describedby={helpId}
              className="min-h-11 w-full rounded border border-[var(--sparkle-border)] bg-white p-2 font-normal"
              name="personalPhoto"
              onChange={handlePhotoChange}
              ref={inputRef}
              type="file"
            />
          </label>
          <p className="text-xs leading-5 text-[var(--sparkle-ink-muted)]" id={helpId}>JPG, PNG, or WebP. Maximum 500 KB.</p>
          {showingPersonalPhoto ? (
            <button
              className="min-h-11 w-fit rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-white px-3 text-sm font-bold text-[var(--sparkle-coral)]"
              onClick={useCatalogPhoto}
              type="button"
            >
              Remove personal photo
            </button>
          ) : null}
        </div>
      </div>
      <input name="removePersonalPhoto" type="hidden" value={removePersonalPhoto ? "yes" : "no"} />
      {removePersonalPhoto ? (
        <p className="text-sm font-semibold text-[var(--sparkle-ink-muted)]" role="status">
          Your personal photo will be removed when you save. The catalog image will remain.
        </p>
      ) : null}
    </fieldset>
  );
}

function CollectionMembership({
  action,
  collections,
  disabled,
  item,
  pending,
}: {
  action: (formData: FormData) => void;
  collections: ShowcaseCollection[];
  disabled: boolean;
  item: ManagedCollectionItem;
  pending: boolean;
}) {
  return (
    <section className="grid content-start gap-3 rounded-[var(--sparkle-radius-sm)] bg-[var(--sparkle-paper-soft)] p-4" aria-label={`Showcase Collection membership for ${item.jewelryItem.name}`}>
      <div>
        <p className="inline-flex items-center gap-2 font-bold text-[var(--sparkle-plum-deep)]"><FolderHeart aria-hidden="true" className="size-5" /> Showcase Collections</p>
        <p className="mt-1 text-sm leading-6 text-[var(--sparkle-ink-muted)]">See where this piece appears and change one collection at a time.</p>
      </div>
      {collections.length === 0 ? (
        <p className="text-sm text-[var(--sparkle-ink-muted)]">Create a Showcase Collection above first.</p>
      ) : (
        <ul className="grid gap-2">
          {collections.map((collection) => {
            const included = collection.pieceIds.includes(item.id);

            return (
              <li className="grid gap-2 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-white p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" key={collection.id}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[var(--sparkle-plum-deep)]">{collection.title}</p>
                  <span className={`mt-1 inline-flex rounded-full px-2 py-1 text-xs font-bold ${included ? "bg-emerald-50 text-emerald-700" : "bg-[var(--sparkle-paper-soft)] text-[var(--sparkle-ink-muted)]"}`}>
                    {included ? "Included" : "Not included"}
                  </span>
                </div>
                <form action={action}>
                  <input name="collectionItemId" type="hidden" value={item.id} />
                  <input name="collectionId" type="hidden" value={collection.id} />
                  <button
                    aria-busy={pending}
                    className={`min-h-11 w-full rounded-[var(--sparkle-radius-sm)] px-3 text-sm font-bold disabled:opacity-50 ${included ? "border border-[var(--sparkle-border)] text-[var(--sparkle-plum)]" : "bg-[var(--sparkle-plum)] text-white"}`}
                    disabled={disabled || pending}
                    name="operation"
                    type="submit"
                    value={included ? "remove" : "add"}
                  >
                    {included ? "Remove" : "Add"}
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function CollectionForm({ action, collection, disabled, pending }: { action: (formData: FormData) => void; collection?: ShowcaseCollection; disabled: boolean; pending: boolean }) {
  return (
    <form action={action} className="grid gap-3">
      {collection ? <input name="collectionId" type="hidden" value={collection.id} /> : null}
      <label className="grid gap-1 text-sm font-bold">Title<input className="min-h-11 rounded border border-[var(--sparkle-border)] bg-white px-3 font-normal" defaultValue={collection?.title} maxLength={80} name="title" placeholder="Purple Dreams" required /></label>
      <label className="grid gap-1 text-sm font-bold">Description<textarea className="min-h-20 rounded border border-[var(--sparkle-border)] bg-white p-3 font-normal" defaultValue={collection?.description} maxLength={240} name="description" placeholder="A short introduction to this group." /></label>
      <label className="grid gap-1 text-sm font-bold">Visibility<select className="min-h-11 rounded border border-[var(--sparkle-border)] bg-white px-3 font-normal" defaultValue={collection?.visibility ?? "private"} name="visibility"><option value="private">Private</option><option value="public">Public</option></select></label>
      <SubmitButton disabled={disabled} pending={pending}>{collection ? "Update collection" : "Create collection"}</SubmitButton>
    </form>
  );
}

function VisibilityChoice({ defaultChecked, icon, label, value }: { defaultChecked: boolean; icon: React.ReactNode; label: string; value: string }) {
  return <label className="flex min-h-11 items-center gap-2 rounded border border-[var(--sparkle-border)] bg-white px-3 text-sm font-bold"><input defaultChecked={defaultChecked} name="visibility" type="radio" value={value} />{icon}{label}</label>;
}

function SubmitButton({ children, disabled, pending }: { children: React.ReactNode; disabled: boolean; pending: boolean }) {
  return <button className="inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-[var(--sparkle-radius-sm)] bg-[var(--sparkle-plum)] px-4 text-sm font-bold text-white disabled:opacity-50" disabled={disabled || pending} type="submit">{pending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Save aria-hidden="true" className="size-4" />}{children}</button>;
}

function ActionStatus({ state }: { state: SilverSaveActionState }) {
  if (state.status === "idle") return null;
  return <p className="text-sm font-bold text-[var(--sparkle-ink-muted)]" role="status"><Sparkles aria-hidden="true" className="mr-1 inline size-4 text-[var(--sparkle-coral)]" />{state.message}</p>;
}

async function disabledAction(): Promise<SilverSaveActionState> {
  return { status: "denied", message: "Sign in to save Showcase updates." };
}

function normalizeHandlePreview(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
