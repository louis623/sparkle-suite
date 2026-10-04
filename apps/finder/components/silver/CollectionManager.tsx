"use client";

import { useActionState, useState } from "react";
import { BookmarkPlus, Gem, LoaderCircle, Plus, Search, ShieldCheck, Star, StickyNote } from "lucide-react";
import { finderCollectionSaveSilverMessage } from "@/lib/sparkle-finder/access-split";
import { addJewelryItemToCustomerCollection } from "@/lib/sparkle-finder/customer-state";
import type { SparkleFinderAccountState } from "@/lib/sparkle-finder/auth";
import type { CollectionItem, JewelryItem } from "@/lib/sparkle-finder/types";
import type { SilverSaveActionState } from "@/app/(hub)/silver/actions";
import type { SparkleShowcaseItemStatus, SparkleShowcaseVisibility } from "@/lib/sparkle-finder/showcase-types";

export type ManagedCollectionItem = CollectionItem & {
  jewelryItem: JewelryItem;
  visibility?: SparkleShowcaseVisibility;
  showcaseStatus?: SparkleShowcaseItemStatus;
  revealStory?: string;
  personalPhotoUrl?: string | null;
  isRarestReveal?: boolean;
};

type CollectionManagerProps = {
  accountState: SparkleFinderAccountState;
  canSaveSilverActions: boolean;
  collectionItems: ManagedCollectionItem[];
  isLocalPreview: boolean;
  libraryItems: JewelryItem[];
  saveAction?: (previousState: SilverSaveActionState, formData: FormData) => Promise<SilverSaveActionState>;
};

const realAccountInitialState: SilverSaveActionState = {
  status: "idle",
  message: "Wishlist and collection ready.",
};

export function CollectionManager({
  accountState,
  canSaveSilverActions,
  collectionItems,
  isLocalPreview,
  libraryItems,
  saveAction,
}: CollectionManagerProps) {
  const [items, setItems] = useState(collectionItems);
  const [localStatusMessage, setLocalStatusMessage] = useState(
    canSaveSilverActions ? "Local collection preview ready." : finderCollectionSaveSilverMessage,
  );
  const [actionState, formAction, isPending] = useActionState(saveAction ?? disabledCollectionAction, realAccountInitialState);
  const statusMessage = isLocalPreview ? localStatusMessage : actionState.message;
  const collectionByJewelryId = new Map(items.map((item) => [item.jewelryItemId, item]));

  function previewAdd(item: JewelryItem, state: CollectionItem["state"]) {
    const result = addJewelryItemToCustomerCollection(accountState, items, {
      isHighlighted: state === "owned",
      jewelryItemId: item.id,
      note: getDefaultCollectionNote(state, true),
      state,
    });

    if (!result.ok) {
      setLocalStatusMessage(finderCollectionSaveSilverMessage);
      return;
    }

    setItems(result.collectionItems.map((collectionItem) => ({ ...collectionItem, jewelryItem: findJewelryItem(collectionItem.jewelryItemId, libraryItems) })));
    setLocalStatusMessage(state === "wishlist" ? "Wishlist preview updated." : "Collection preview updated.");
  }

  return (
    <section className="grid gap-5">
      <article className="rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-[var(--sparkle-paper)] p-5 shadow-[var(--sparkle-shadow-sm)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sparkle-coral)]">Saved pieces</p>
            <h2 className="mt-1 font-[family-name:var(--font-playfair)] text-3xl font-semibold text-[var(--sparkle-plum-deep)]">
              Wishlist & Owned Collection
            </h2>
          </div>
          <span className="rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-[var(--sparkle-blush-bg)] px-3 py-1 text-xs font-bold text-[var(--sparkle-ink-muted)]">
            {items.length} {isLocalPreview ? "local" : "saved"} records
          </span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <SavedCollectionCard item={item} key={item.id} />
          ))}
        </div>
      </article>

      <article className="rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-[var(--sparkle-paper)] p-5 shadow-[var(--sparkle-shadow-sm)]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sparkle-coral)]">Library actions</p>
          <h2 className="mt-1 font-[family-name:var(--font-playfair)] text-3xl font-semibold text-[var(--sparkle-plum-deep)]">
            Add From Jewelry Library
          </h2>
        </div>

        <div className="mt-5 grid gap-3 xl:grid-cols-2">
          {libraryItems.map((item) => {
            const savedItem = collectionByJewelryId.get(item.id);

            return (
              <div
                className="grid gap-3 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-[var(--sparkle-paper-soft)] p-4"
                key={item.id}
              >
                <div className="flex items-start gap-3">
                  <div className="grid size-12 shrink-0 place-items-center rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-white text-[var(--sparkle-plum)]">
                    <Gem aria-hidden="true" className="size-6" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold leading-tight text-[var(--sparkle-plum-deep)]">{item.name}</h3>
                    <p className="mt-1 text-sm leading-5 text-[var(--sparkle-ink-muted)]">{item.collectionName}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <CollectionActionButton
                    canSave={canSaveSilverActions}
                    formAction={formAction}
                    icon="owned"
                    isLocalPreview={isLocalPreview}
                    isPending={isPending}
                    item={item}
                    label="Add to collection"
                    onPreviewAdd={previewAdd}
                    state="owned"
                  />
                  <CollectionActionButton
                    canSave={canSaveSilverActions}
                    formAction={formAction}
                    icon="wishlist"
                    isLocalPreview={isLocalPreview}
                    isPending={isPending}
                    item={item}
                    label="Add to Wishlist"
                    onPreviewAdd={previewAdd}
                    state="wishlist"
                  />
                  <CollectionActionButton
                    canSave={canSaveSilverActions}
                    formAction={formAction}
                    icon="private_note_only"
                    isLocalPreview={isLocalPreview}
                    isPending={isPending}
                    item={item}
                    label="Add private note"
                    onPreviewAdd={previewAdd}
                    state="private_note_only"
                  />
                  {savedItem ? <StateBadge state={savedItem.state} /> : null}
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-sm font-semibold text-[var(--sparkle-ink-muted)]" role="status">
          {statusMessage}
        </p>

        <div className="mt-5 rounded-[var(--sparkle-radius-sm)] border border-dashed border-[var(--sparkle-border-strong)] bg-[var(--sparkle-blush-bg)] p-4">
          <div className="flex items-start gap-3">
            <Search aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[var(--sparkle-coral)]" />
            <div>
              <h3 className="font-bold text-[var(--sparkle-plum-deep)]">Need a missing piece?</h3>
              <p className="mt-1 text-sm leading-6 text-[var(--sparkle-ink-muted)]">
                Search the jewelry library first, then ask Nic-Nac to help track pieces that have not made it into the
                database yet.
              </p>
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}

function CollectionActionButton({
  canSave,
  formAction,
  icon,
  isLocalPreview,
  isPending,
  item,
  label,
  onPreviewAdd,
  state,
}: {
  canSave: boolean;
  formAction: (formData: FormData) => void;
  icon: CollectionItem["state"];
  isLocalPreview: boolean;
  isPending: boolean;
  item: JewelryItem;
  label: string;
  onPreviewAdd: (item: JewelryItem, state: CollectionItem["state"]) => void;
  state: CollectionItem["state"];
}) {
  const className =
    state === "owned"
      ? "inline-flex min-h-10 items-center gap-2 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border-strong)] bg-white px-3 text-sm font-bold text-[var(--sparkle-plum)] transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55"
      : "inline-flex min-h-10 items-center gap-2 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-white px-3 text-sm font-bold text-[var(--sparkle-rose)] transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55";
  const disabled = !canSave || (!isLocalPreview && isPending);
  const buttonLabel = !isLocalPreview && isPending ? "Saving..." : label;
  const buttonIcon = !isLocalPreview && isPending ? (
    <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
  ) : (
    <CollectionActionIcon state={icon} />
  );

  if (isLocalPreview) {
    return (
      <button aria-busy={false} className={className} disabled={disabled} onClick={() => onPreviewAdd(item, state)} type="button">
        {buttonIcon}
        {buttonLabel}
      </button>
    );
  }

  return (
    <form action={formAction}>
      <input name="jewelryItemId" type="hidden" value={item.id} />
      <input name="state" type="hidden" value={state} />
      <input name="note" type="hidden" value={getDefaultCollectionNote(state, false)} />
      <input name="isHighlighted" type="hidden" value={state === "owned" ? "yes" : "no"} />
      <button aria-busy={isPending} className={className} disabled={disabled} type="submit">
        {buttonIcon}
        {buttonLabel}
      </button>
    </form>
  );
}

function CollectionActionIcon({ state }: { state: CollectionItem["state"] }) {
  if (state === "wishlist") {
    return <BookmarkPlus aria-hidden="true" className="size-4" />;
  }

  if (state === "private_note_only") {
    return <StickyNote aria-hidden="true" className="size-4" />;
  }

  return <Plus aria-hidden="true" className="size-4" />;
}

function SavedCollectionCard({ item }: { item: ManagedCollectionItem }) {
  return (
    <div className="rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-[var(--sparkle-paper-soft)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-[var(--sparkle-plum-deep)]">{item.jewelryItem.name}</h3>
          <p className="mt-1 text-sm leading-5 text-[var(--sparkle-ink-muted)]">{item.jewelryItem.collectionName}</p>
        </div>
        {item.isHighlighted ? <ShieldCheck aria-hidden="true" className="size-5 shrink-0 text-[var(--sparkle-coral)]" /> : null}
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--sparkle-ink-muted)]">{item.note}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <StateBadge state={item.state} />
        {item.isHighlighted ? (
          <span className="inline-flex items-center gap-1 rounded border border-[#e7be77] bg-[#fff3cf] px-2 py-1 text-xs font-bold text-[#704b11]">
            <Star aria-hidden="true" className="size-3" />
            Highlighted
          </span>
        ) : null}
      </div>
    </div>
  );
}

function StateBadge({ state }: { state: CollectionItem["state"] }) {
  const labels: Record<CollectionItem["state"], string> = {
    owned: "Owned",
    private_note_only: "Private note",
    wishlist: "Wishlist",
  };

  return (
    <span className="rounded border border-[var(--sparkle-border)] bg-white px-2 py-1 text-xs font-bold text-[var(--sparkle-ink-muted)]">
      {labels[state]}
    </span>
  );
}

function findJewelryItem(jewelryItemId: string, libraryItems: JewelryItem[]): JewelryItem {
  return libraryItems.find((item) => item.id === jewelryItemId) ?? libraryItems[0];
}

function getDefaultCollectionNote(state: CollectionItem["state"], isLocalPreview: boolean): string {
  if (state === "wishlist") {
    return "Watching this library record.";
  }

  if (state === "private_note_only") {
    return isLocalPreview ? "Private note from the local Silver preview." : "Private note saved from Silver.";
  }

  return isLocalPreview ? "Added from the local Silver preview." : "Added from Silver.";
}

async function disabledCollectionAction(): Promise<SilverSaveActionState> {
  return {
    status: "denied",
    message: finderCollectionSaveSilverMessage,
  };
}
