"use client";

import { useActionState, useMemo, useState } from "react";
import { BookmarkPlus, CheckCircle2, Gem, LoaderCircle, PackageCheck, Search, Sparkles } from "lucide-react";
import { FindThisForMe } from "@/components/nic-nac/FindThisForMe";
import { finderCollectionSaveSilverMessage } from "@/lib/sparkle-finder/access-split";
import { addJewelryItemToCustomerCollection } from "@/lib/sparkle-finder/customer-state";
import type { SilverSaveActionState } from "@/app/(hub)/silver/actions";
import type { ManagedCollectionItem } from "@/components/silver/CollectionManager";
import type { SparkleFinderAccountState } from "@/lib/sparkle-finder/auth";
import type { CollectionItem, JewelryItem } from "@/lib/sparkle-finder/types";

type SimpleSilverShowcaseProps = {
  accountState: SparkleFinderAccountState;
  canSaveSilverActions: boolean;
  collectionItems: ManagedCollectionItem[];
  isLocalPreview: boolean;
  libraryItems: JewelryItem[];
  saveAction?: (previousState: SilverSaveActionState, formData: FormData) => Promise<SilverSaveActionState>;
};

const initialState: SilverSaveActionState = {
  status: "idle",
  message: "Wishlist and collection ready.",
};

const showcaseCollections = ["My Collection", "Never Leaving", "Rarest Reveals", "Favorites"];

export function SimpleSilverShowcase({
  accountState,
  canSaveSilverActions,
  collectionItems,
  isLocalPreview,
  libraryItems,
  saveAction,
}: SimpleSilverShowcaseProps) {
  const [items, setItems] = useState(collectionItems);
  const [localStatusMessage, setLocalStatusMessage] = useState(
    canSaveSilverActions ? "Wishlist and collection ready." : finderCollectionSaveSilverMessage,
  );
  const [actionState, formAction, isPending] = useActionState(saveAction ?? disabledCollectionAction, initialState);
  const statusMessage = isLocalPreview ? localStatusMessage : actionState.message;
  const savedIds = useMemo(() => new Set(items.map((item) => item.jewelryItemId)), [items]);
  const savedCards = items.length > 0 ? items : libraryItems.slice(0, 3).map((item) => createPreviewCard(item, accountState));
  const libraryCards = libraryItems.filter((item) => !savedIds.has(item.id)).slice(0, 8);

  function previewAdd(item: JewelryItem, state: CollectionItem["state"], note: string) {
    const result = addJewelryItemToCustomerCollection(accountState, items, {
      isHighlighted: state === "owned",
      jewelryItemId: item.id,
      note,
      state,
    });

    if (!result.ok) {
      setLocalStatusMessage(finderCollectionSaveSilverMessage);
      return;
    }

    setItems(result.collectionItems.map((collectionItem) => ({ ...collectionItem, jewelryItem: findJewelryItem(collectionItem.jewelryItemId, libraryItems) })));
    setLocalStatusMessage(state === "wishlist" ? "Added to Wishlist." : "Added to your collection.");
  }

  return (
    <section className="grid gap-5" data-smoke="simple-silver-showcase">
      <article className="rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-[var(--sparkle-paper)] p-4 shadow-[var(--sparkle-shadow-sm)] sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sparkle-coral)]">Your jewelry</p>
            <h2 className="mt-1 font-[family-name:var(--font-playfair)] text-3xl font-semibold leading-tight text-[var(--sparkle-plum-deep)]">
              Wishlist & Collection
            </h2>
          </div>
          <span className="rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-[var(--sparkle-blush-bg)] px-3 py-1 text-xs font-bold text-[var(--sparkle-ink-muted)]">
            {items.length} saved
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {savedCards.map((item) => (
            <JewelryActionCard
              accountState={accountState}
              canSave={canSaveSilverActions}
              formAction={formAction}
              isLocalPreview={isLocalPreview}
              isPending={isPending}
              item={item.jewelryItem}
              key={item.id}
              onPreviewAdd={previewAdd}
              savedState={item.state}
            />
          ))}
        </div>
      </article>

      <article className="rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-[var(--sparkle-paper)] p-4 shadow-[var(--sparkle-shadow-sm)] sm:p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sparkle-coral)]">Add from library</p>
          <h2 className="mt-1 font-[family-name:var(--font-playfair)] text-3xl font-semibold leading-tight text-[var(--sparkle-plum-deep)]">
            Pick a piece
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--sparkle-ink-muted)]">
            Add a piece to your Wishlist instantly, mark it as owned, or ask Nic-Nac to look for a fresh 48-hour lead.
          </p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {libraryCards.map((item) => (
            <JewelryActionCard
              accountState={accountState}
              canSave={canSaveSilverActions}
              formAction={formAction}
              isLocalPreview={isLocalPreview}
              isPending={isPending}
              item={item}
              key={item.id}
              onPreviewAdd={previewAdd}
            />
          ))}
        </div>
        <p className="mt-4 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-[var(--sparkle-paper-soft)] px-3 py-2 text-sm font-bold text-[var(--sparkle-ink-muted)]" role="status">
          {statusMessage}
        </p>
      </article>
    </section>
  );
}

function JewelryActionCard({
  accountState,
  canSave,
  formAction,
  isLocalPreview,
  isPending,
  item,
  onPreviewAdd,
  savedState,
}: {
  accountState: SparkleFinderAccountState;
  canSave: boolean;
  formAction: (formData: FormData) => void;
  isLocalPreview: boolean;
  isPending: boolean;
  item: JewelryItem;
  onPreviewAdd: (item: JewelryItem, state: CollectionItem["state"], note: string) => void;
  savedState?: CollectionItem["state"];
}) {
  const [panel, setPanel] = useState<"none" | "own" | "find">("none");
  const [wishlistMessage, setWishlistMessage] = useState("");
  const disabled = !canSave || (!isLocalPreview && isPending);

  function addWishlistPreview() {
    onPreviewAdd(item, "wishlist", `Added ${item.name} to Wishlist.`);
    setWishlistMessage("Added to Wishlist.");
  }

  return (
    <article className="grid content-start gap-3 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-[var(--sparkle-paper-soft)] p-3">
      <div className="flex items-start gap-3">
        <div className="grid size-12 shrink-0 place-items-center rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-white text-[var(--sparkle-plum)]">
          <Gem aria-hidden="true" className="size-6" strokeWidth={1.5} />
        </div>
        <div className="min-w-0">
          <h3 className="font-bold leading-tight text-[var(--sparkle-plum-deep)]">{item.name}</h3>
          <p className="mt-1 text-sm leading-5 text-[var(--sparkle-ink-muted)]">{item.collectionName}</p>
          {savedState ? <StateBadge state={savedState} /> : null}
        </div>
      </div>

      <div className="grid gap-2">
        {isLocalPreview ? (
          <button className={actionButtonClass("wishlist")} disabled={disabled} onClick={addWishlistPreview} type="button">
            <BookmarkPlus aria-hidden="true" className="size-4" />
            Add to Wishlist
          </button>
        ) : (
          <form action={formAction}>
            <input name="jewelryItemId" type="hidden" value={item.id} />
            <input name="state" type="hidden" value="wishlist" />
            <input name="note" type="hidden" value={`Added ${item.name} to Wishlist.`} />
            <input name="isHighlighted" type="hidden" value="no" />
            <button
              aria-busy={isPending}
              className={actionButtonClass("wishlist")}
              disabled={disabled}
              onClick={() => setWishlistMessage("Added to Wishlist.")}
              type="submit"
            >
              {isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <BookmarkPlus aria-hidden="true" className="size-4" />}
              Add to Wishlist
            </button>
          </form>
        )}
        {wishlistMessage ? (
          <p className="inline-flex items-center gap-2 rounded-[var(--sparkle-radius-sm)] border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
            <CheckCircle2 aria-hidden="true" className="size-4" />
            {wishlistMessage}
          </p>
        ) : null}
        <button className={actionButtonClass("owned")} disabled={disabled} onClick={() => setPanel(panel === "own" ? "none" : "own")} type="button">
          <PackageCheck aria-hidden="true" className="size-4" />
          I Own This
        </button>
        <button className={actionButtonClass("find")} disabled={disabled} onClick={() => setPanel(panel === "find" ? "none" : "find")} type="button">
          <Search aria-hidden="true" className="size-4" />
          Help Me Find It
        </button>
      </div>

      {panel === "own" ? (
        <OwnedPiecePanel
          formAction={formAction}
          isLocalPreview={isLocalPreview}
          isPending={isPending}
          item={item}
          onPreviewAdd={onPreviewAdd}
          saveEnabled={canSave}
        />
      ) : null}

      {panel === "find" ? (
        <div className="rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-white p-3">
          <FindThisForMe accountState={accountState} compact jewelryItemId={item.id} />
        </div>
      ) : null}
    </article>
  );
}

function OwnedPiecePanel({
  formAction,
  isLocalPreview,
  isPending,
  item,
  onPreviewAdd,
  saveEnabled,
}: {
  formAction: (formData: FormData) => void;
  isLocalPreview: boolean;
  isPending: boolean;
  item: JewelryItem;
  onPreviewAdd: (item: JewelryItem, state: CollectionItem["state"], note: string) => void;
  saveEnabled: boolean;
}) {
  const [note, setNote] = useState("");
  const [showcaseCollection, setShowcaseCollection] = useState(showcaseCollections[0]);
  const disabled = !saveEnabled || (!isLocalPreview && isPending);
  const savedNote = note.trim();

  if (isLocalPreview) {
    return (
      <div className="grid gap-3 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-white p-3">
        <OwnershipFields
          note={note}
          onNoteChange={setNote}
          onShowcaseCollectionChange={setShowcaseCollection}
          showcaseCollection={showcaseCollection}
        />
        <button
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--sparkle-radius-sm)] bg-[var(--sparkle-plum)] px-4 text-sm font-bold text-white"
          disabled={disabled}
          onClick={() => onPreviewAdd(item, "owned", savedNote || `Added ${item.name} to my collection.`)}
          type="button"
        >
          <Sparkles aria-hidden="true" className="size-4" />
          Save to Collection
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-3 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-white p-3">
      <input name="jewelryItemId" type="hidden" value={item.id} />
      <input name="state" type="hidden" value="owned" />
      <input name="note" type="hidden" value={savedNote || `Added ${item.name} to my collection.`} />
      <input name="isHighlighted" type="hidden" value="yes" />
      <input name="showcaseCollectionTitle" type="hidden" value={showcaseCollection} />
      <OwnershipFields
        note={note}
        onNoteChange={setNote}
        onShowcaseCollectionChange={setShowcaseCollection}
        showcaseCollection={showcaseCollection}
      />
      <button
        aria-busy={isPending}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--sparkle-radius-sm)] bg-[var(--sparkle-plum)] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        type="submit"
      >
        {isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Sparkles aria-hidden="true" className="size-4" />}
        Save to Collection
      </button>
    </form>
  );
}

function OwnershipFields({
  note,
  onNoteChange,
  onShowcaseCollectionChange,
  showcaseCollection,
}: {
  note: string;
  onNoteChange: (value: string) => void;
  onShowcaseCollectionChange: (value: string) => void;
  showcaseCollection: string;
}) {
  return (
    <>
      <label className="grid gap-1 text-sm font-bold text-[var(--sparkle-plum-deep)]">
        Note
        <textarea
          className="min-h-20 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-[var(--sparkle-paper-soft)] p-3 text-sm font-normal leading-6 text-[var(--sparkle-ink)]"
          onChange={(event) => onNoteChange(event.target.value)}
          placeholder="Add a short note if you want."
          value={note}
        />
      </label>
      <label className="grid gap-1 text-sm font-bold text-[var(--sparkle-plum-deep)]">
        Showcase collection
        <select
          className="min-h-10 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-white px-3 text-sm font-normal text-[var(--sparkle-ink)]"
          onChange={(event) => onShowcaseCollectionChange(event.target.value)}
          value={showcaseCollection}
        >
          {showcaseCollections.map((collection) => (
            <option key={collection} value={collection}>
              {collection}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

function StateBadge({ state }: { state: CollectionItem["state"] }) {
  const labelByState: Record<CollectionItem["state"], string> = {
    owned: "Owned",
    private_note_only: "Private note",
    wishlist: "Wishlist",
  };

  return (
    <span className="mt-2 inline-flex w-fit rounded border border-[var(--sparkle-border)] bg-white px-2 py-1 text-xs font-bold text-[var(--sparkle-ink-muted)]">
      {labelByState[state]}
    </span>
  );
}

function actionButtonClass(tone: "find" | "owned" | "wishlist") {
  const base =
    "inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-[var(--sparkle-radius-sm)] px-3 text-sm font-bold transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55";

  if (tone === "owned") {
    return `${base} bg-[var(--sparkle-plum)] text-white`;
  }

  if (tone === "find") {
    return `${base} border border-[var(--sparkle-border-strong)] bg-white text-[var(--sparkle-plum)]`;
  }

  return `${base} border border-[var(--sparkle-border)] bg-white text-[var(--sparkle-rose)]`;
}

function createPreviewCard(item: JewelryItem, accountState: SparkleFinderAccountState): ManagedCollectionItem {
  const customerId = accountState.status === "authenticated" ? accountState.customer.id : "preview";

  return {
    customerId,
    id: `preview-${item.id}`,
    isHighlighted: false,
    jewelryItem: item,
    jewelryItemId: item.id,
    note: `Added ${item.name} to Wishlist.`,
    state: "wishlist",
  };
}

function findJewelryItem(jewelryItemId: string, libraryItems: JewelryItem[]): JewelryItem {
  return libraryItems.find((item) => item.id === jewelryItemId) ?? libraryItems[0];
}

async function disabledCollectionAction(): Promise<SilverSaveActionState> {
  return {
    status: "denied",
    message: finderCollectionSaveSilverMessage,
  };
}
