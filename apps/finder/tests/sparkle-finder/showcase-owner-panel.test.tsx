import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ShowcaseOwnerPanel } from "../../components/showcase/ShowcaseOwnerPanel";
import type { ManagedCollectionItem } from "../../components/silver/CollectionManager";

const ownerAction = async () => ({ status: "saved" as const, message: "Saved." });

const collectionItem: ManagedCollectionItem = {
  id: "b1d5d56c-e870-4c37-8af1-c76127642ff0",
  customerId: "user-1",
  jewelryItemId: "jewelry-1",
  state: "owned",
  note: "Private owner note",
  isHighlighted: false,
  acquisitionSource: "manual",
  acquisitionContext: {},
  acquisitionMarkedAt: null,
  visibility: "private",
  showcaseStatus: "owned",
  revealStory: "",
  personalPhotoUrl: null,
  isRarestReveal: false,
  jewelryItem: {
    id: "jewelry-1",
    name: "Amethyst Dreams",
    jewelryType: "ring",
    collectionName: "Birthday Collection",
    collectionYear: 2026,
    itemNumber: "R1234",
    bpLabel: "standard",
    imageUrl: "https://images.example/item.jpg",
    knownRepListingIds: [],
  },
};

describe("Showcase owner workflow", () => {
  it("renders phone-friendly explicit privacy, story, photo, and collection controls", () => {
    const markup = renderToStaticMarkup(
      <ShowcaseOwnerPanel
        assignPieceAction={ownerAction}
        canSave
        collectionItems={[collectionItem]}
        data={{
          handle: "casey-finds",
          tagline: "Purple stacks",
          visibility: "private",
          collections: [{
            id: "9fc64c56-42ee-4c7a-95ca-710648e637af",
            customerId: "user-1",
            title: "Purple Dreams",
            slug: "purple-dreams",
            description: "Favorite purple reveals.",
            visibility: "private",
            pieceIds: [collectionItem.id],
          }, {
            id: "116b1d77-6199-411c-8484-e3f5df1e4353",
            customerId: "user-1",
            title: "Never Leaving",
            slug: "never-leaving",
            description: "Forever favorites.",
            visibility: "private",
            pieceIds: [],
          }],
        }}
        deleteCollectionAction={ownerAction}
        isLocalPreview={false}
        saveCollectionAction={ownerAction}
        savePieceAction={ownerAction}
        saveProfileAction={ownerAction}
      />,
    );

    expect(markup).toContain("Nothing becomes public automatically");
    expect(markup).toContain("Make public");
    expect(markup).toContain("Personal piece photo");
    expect(markup).toContain("Showcase story");
    expect(markup).toContain("Private Preview");
    expect(markup).toContain("Showcase Collections");
    expect(markup).toContain("Private notes are never included");
    expect(markup).toContain("Your address: yoursparklefinder.com/showcase/");
    expect(markup).toContain("casey-finds");
    expect(markup).toContain("Included");
    expect(markup).toContain("Not included");
    expect(markup).toContain("never removes its jewelry from your collection");
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain("Edit piece details");
    expect(markup).toContain("Catalog image");
  });

  it("shows the current personal photo and explicit replace/remove controls", () => {
    const markup = renderToStaticMarkup(
      <ShowcaseOwnerPanel
        canSave
        collectionItems={[{ ...collectionItem, personalPhotoUrl: "https://images.example/my-amethyst.jpg" }]}
        data={{ handle: "casey-finds", tagline: "Purple stacks", visibility: "private", collections: [] }}
        isLocalPreview={false}
        savePieceAction={ownerAction}
      />,
    );

    expect(markup).toContain("https://images.example/my-amethyst.jpg");
    expect(markup).toContain("Your photo");
    expect(markup).toContain("Replace photo");
    expect(markup).toContain("Remove personal photo");
    expect(markup).toContain('name="removePersonalPhoto"');
  });

  it("offers Rarest Reveal selection only for owned pieces", () => {
    const wishlistItem: ManagedCollectionItem = {
      ...collectionItem,
      id: "wishlist-piece",
      state: "wishlist",
      showcaseStatus: "iso",
      jewelryItem: { ...collectionItem.jewelryItem, id: "wanted-jewelry", name: "Wanted Amethyst" },
      jewelryItemId: "wanted-jewelry",
      isRarestReveal: true,
    };
    const markup = renderToStaticMarkup(
      <ShowcaseOwnerPanel
        canSave
        collectionItems={[wishlistItem]}
        data={{ handle: "casey-finds", tagline: "Purple stacks", visibility: "private", collections: [] }}
        isLocalPreview={false}
        savePieceAction={ownerAction}
      />,
    );

    expect(markup).not.toContain('name="isRarestReveal"');
    expect(markup).toContain("only owned pieces can be Rarest Reveals");
  });

  it("explains automatic Diamond and Unicorn rarity without an opt-out checkbox", () => {
    const diamondItem: ManagedCollectionItem = {
      ...collectionItem,
      jewelryItem: { ...collectionItem.jewelryItem, bpLabel: "diamond" },
    };
    const markup = renderToStaticMarkup(
      <ShowcaseOwnerPanel
        canSave
        collectionItems={[diamondItem]}
        data={{ handle: "casey-finds", tagline: "Purple stacks", visibility: "private", collections: [] }}
        isLocalPreview={false}
        savePieceAction={ownerAction}
      />,
    );

    expect(markup).toContain("This Diamond is automatically featured in The Rarest of Reveals while it is owned.");
    expect(markup).not.toContain('name="isRarestReveal"');
  });

  it("verifies the authenticated account and never accepts a hidden owner ID", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "app/(hub)/silver/showcase-owner-actions.ts"),
      "utf8",
    );

    expect(source).toContain("supabase.auth.getUser()");
    expect(source).toContain("accountState.customer.id !== data.user.id");
    expect(source).not.toContain("accountState.membership?.hasSilverAccess !== true");
    expect(source).toContain('.eq("user_id", verified.userId)');
    expect(source).toContain('.select("showcase_handle")');
    expect(source).toContain("revalidateShowcasePaths(previousHandle, handle)");
    expect(source).toContain('.select("id")');
    expect(source).toContain('readField(deleted.data, "id") !== collectionId');
    expect(source).toContain("Every piece stayed in your collection");
    expect(source).not.toContain('formData.get("userId")');
    expect(source).not.toContain('formData.get("customerId")');
  });

  it("requires an inline second confirmation before collection deletion", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "components/showcase/ShowcaseOwnerPanel.tsx"),
      "utf8",
    );

    expect(source).toContain("Remove “{collection.title}”?");
    expect(source).toContain("Yes, remove collection");
    expect(source).toContain("Keep collection");
    expect(source).toContain("Every piece stays safely in your collection");
    expect(source).toContain('role="alertdialog"');
    expect(source).toContain("confirmButtonRef.current?.focus()");
    expect(source).toContain("triggerRef.current?.focus()");
  });

  it("resets an unsaved photo preview after its save attempt finishes", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "components/showcase/ShowcaseOwnerPanel.tsx"),
      "utf8",
    );

    expect(source).toContain("observedPendingRef.current");
    expect(source).toContain("setPhotoResetKey((value) => value + 1)");
    expect(source).toContain("showActionStatus ? <ActionStatus state={state} /> : null");
  });
});
