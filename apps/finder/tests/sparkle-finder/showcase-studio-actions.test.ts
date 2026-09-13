import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();
const createClient = vi.fn();
const getCurrentAccount = vi.fn();
const createServiceClient = vi.fn();
const persistSubmission = vi.fn();
const submitIntake = vi.fn();
const persistBridgeOutcome = vi.fn();
const reconstructRetry = vi.fn();
const readSubmissionRow = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: (...args: unknown[]) => createClient(...args) }));
vi.mock("@/lib/supabase/service-role", () => ({
  createSupabaseServiceRoleClient: (...args: unknown[]) => createServiceClient(...args),
}));
vi.mock("@/lib/sparkle-finder/account-service", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../lib/sparkle-finder/account-service")>();
  return { ...original, getCurrentSparkleFinderAccount: (...args: unknown[]) => getCurrentAccount(...args) };
});
vi.mock("@/lib/sparkle-finder/showcase-studio-state", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../lib/sparkle-finder/showcase-studio-state")>();
  return {
    ...original,
    persistShowcaseStudioSubmissionForAccount: (...args: unknown[]) => persistSubmission(...args),
  };
});
vi.mock("@/lib/sparkle-finder/showcase-studio", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../lib/sparkle-finder/showcase-studio")>();
  return { ...original, submitShowcaseStudioIntake: (...args: unknown[]) => submitIntake(...args) };
});
vi.mock("@/lib/sparkle-finder/showcase-studio-persistence", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../lib/sparkle-finder/showcase-studio-persistence")>();
  return {
    ...original,
    persistShowcaseStudioBridgeOutcomeForOwner: (...args: unknown[]) => persistBridgeOutcome(...args),
    reconstructShowcaseStudioRetryForOwner: (...args: unknown[]) => reconstructRetry(...args),
    readShowcaseStudioSubmissionRow: (...args: unknown[]) => readSubmissionRow(...args),
  };
});

import {
  confirmShowcaseStudioVariantAction,
  retryShowcaseStudioRequestAction,
  submitShowcaseStudioRequestAction,
} from "../../app/(hub)/silver/actions";
import { initialShowcaseStudioPanelActionState } from "../../lib/sparkle-finder/showcase-studio-workflow-types";

const submissionId = "11111111-1111-4111-8111-111111111111";
const labelAssetId = "22222222-2222-4222-8222-222222222222";
const jewelryAssetId = "33333333-3333-4333-8333-333333333333";
const designId = "44444444-4444-4444-8444-444444444444";
const photoEvidence = [
  { finderSubmissionId: submissionId, finderAssetId: labelAssetId, claimedKind: "label" as const },
  { finderSubmissionId: submissionId, finderAssetId: jewelryAssetId, claimedKind: "jewelry" as const },
] as const;
const candidate = {
  designId,
  itemNumber: "RBP5902",
  designName: "Rose Quartz Legacy Necklace",
  material: "Rose gold",
  mainStone: "Rose Quartz",
  jewelryType: "necklace",
  collectionName: "Legacy Sparkle",
  collectionYear: 2020,
  canonicalPhotoUrl: "https://cdn.example.test/rose.jpg",
  description: null,
};

describe("Showcase Studio Silver actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const authenticatedClient = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }) },
    };
    createClient.mockResolvedValue(authenticatedClient);
    createServiceClient.mockReturnValue({ marker: "service" });
    getCurrentAccount.mockResolvedValue({
      status: "authenticated",
      customer: { id: "user-1" },
    });
    persistBridgeOutcome.mockResolvedValue({ ok: true, status: "updated", submissionStatus: "accepted" });
  });

  it("submits exact persisted asset identities to Suite v2 without base64 payloads", async () => {
    persistSubmission.mockResolvedValue({
      ok: true,
      status: "submitted",
      submissionId,
      resumed: false,
      evidenceCommitted: true,
      photoEvidence,
    });
    submitIntake.mockResolvedValue({
      ok: true,
      status: "accepted",
      retryable: false,
      mutationReplayed: false,
      message: "Exact design accepted.",
      suiteDesignId: designId,
      resolvedDesign: candidate,
    });

    const result = await submitShowcaseStudioRequestAction(
      initialShowcaseStudioPanelActionState,
      studioFormData(),
    );

    expect(persistSubmission).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: "authenticated" }),
      expect.objectContaining({ submissionId, itemNumber: "RBP5902", mainStone: "Rose Quartz", rarityClassification: "standard" }),
    );
    expect(submitIntake).toHaveBeenCalledWith({
      action: "resolve",
      finderSubmissionId: submissionId,
      labelDetails: { itemNumber: "RBP5902", bpLabel: "standard", mainStone: "Rose Quartz", material: "Rose gold" },
      customerNote: "Original label is readable.",
      photoEvidence: [...photoEvidence],
    });
    expect(JSON.stringify(submitIntake.mock.calls[0]?.[0])).not.toMatch(/base64|data:image/i);
    expect(persistBridgeOutcome).toHaveBeenCalledWith(
      { marker: "service" },
      expect.objectContaining({
        ownerId: "user-1",
        submissionId,
        outcome: expect.objectContaining({ status: "accepted", suiteCatalogDesignId: designId }),
      }),
    );
    expect(result).toMatchObject({ status: "accepted", submissionId, selectedDesign: candidate });
  });

  it("does not call Suite when private photo storage fails", async () => {
    persistSubmission.mockResolvedValue({
      ok: false,
      reason: "original_label_storage_failed",
      submissionId,
    });

    const result = await submitShowcaseStudioRequestAction(
      initialShowcaseStudioPanelActionState,
      studioFormData(),
    );

    expect(submitIntake).not.toHaveBeenCalled();
    expect(result.message).toContain("could not be stored safely");
    expect(result.message).toContain("No photo-quality decision");
  });

  it("terminates a wrong-owner submission collision so the panel rotates its account-scoped id", async () => {
    persistSubmission.mockResolvedValue({ ok: false, reason: "submission_conflict", submissionId });

    const result = await submitShowcaseStudioRequestAction(
      initialShowcaseStudioPanelActionState,
      studioFormData(),
    );

    expect(submitIntake).not.toHaveBeenCalled();
    expect(result).toMatchObject({ status: "rejected", retryable: false, submissionId });
  });

  it("keeps committed evidence retryable when Suite is temporarily unavailable", async () => {
    persistSubmission.mockResolvedValue({
      ok: true,
      status: "submitted",
      submissionId,
      resumed: false,
      evidenceCommitted: true,
      photoEvidence,
    });
    submitIntake.mockResolvedValue({
      ok: false,
      status: "temporary_failure",
      retryable: true,
      errorCode: "bridge_unreachable",
      customerMessage: "Try again.",
      message: "Try again.",
    });
    persistBridgeOutcome.mockResolvedValue({ ok: true, status: "updated", submissionStatus: "saved_pending_sync" });

    const result = await submitShowcaseStudioRequestAction(
      initialShowcaseStudioPanelActionState,
      studioFormData(),
    );

    expect(persistBridgeOutcome).toHaveBeenCalledWith(
      { marker: "service" },
      expect.objectContaining({ outcome: expect.objectContaining({ status: "saved_pending_sync" }) }),
    );
    expect(result).toMatchObject({ status: "saved_pending_sync", retryable: true, submissionId });
  });

  it("persists Suite replay conflicts as terminal safe failures", async () => {
    submitIntake.mockResolvedValue({
      ok: false,
      status: "conflicting_replay",
      retryable: false,
      errorCode: "submission_conflict",
      customerMessage: "Start a fresh Studio request.",
      message: "Start a fresh Studio request.",
    });
    persistBridgeOutcome.mockResolvedValue({ ok: true, status: "updated", submissionStatus: "rejected" });

    const result = await submitShowcaseStudioRequestAction(
      initialShowcaseStudioPanelActionState,
      studioFormData(),
    );

    expect(persistBridgeOutcome).toHaveBeenCalledWith(
      { marker: "service" },
      expect.objectContaining({ outcome: expect.objectContaining({
        status: "rejected",
        lastError: "conflicting_replay:submission_conflict",
      }) }),
    );
    expect(result).toMatchObject({ status: "error", retryable: false, submissionId });
  });

  it("retries from exact persisted evidence without inserting or uploading again", async () => {
    reconstructRetry.mockResolvedValue({
      ok: true,
      submissionId,
      itemNumber: "RBP5902",
      customerNote: "Original label is readable.",
      mainStone: "Rose Quartz",
      material: "Rose gold",
      originalLabelPhoto: new Blob([jpegBytes()], { type: "image/jpeg" }),
      jewelryFrontPhoto: new Blob([jpegBytes()], { type: "image/jpeg" }),
      photoEvidence,
    });
    submitIntake.mockResolvedValue({
      ok: true,
      status: "publish_queued",
      retryable: false,
      mutationReplayed: true,
      message: "Queued.",
      catalogDraft: { itemNumber: "RBP5902" },
    });

    const form = new FormData();
    form.set("finderSubmissionId", submissionId);
    const result = await retryShowcaseStudioRequestAction(
      { ...initialShowcaseStudioPanelActionState, status: "saved_pending_sync", submissionId, retryable: true },
      form,
    );

    expect(persistSubmission).not.toHaveBeenCalled();
    expect(reconstructRetry).toHaveBeenCalledWith({ marker: "service" }, { ownerId: "user-1", submissionId });
    expect(submitIntake).toHaveBeenCalledWith(expect.objectContaining({ action: "resolve", finderSubmissionId: submissionId }));
    expect(result).toMatchObject({ status: "publish_queued", retryable: false });
  });

  it("rejects confirmation IDs outside the persisted candidate set before calling Suite", async () => {
    readSubmissionRow.mockResolvedValue({
      row: { status: "needs_confirmation", extracted_catalog: { variantCandidates: [candidate] } },
      error: null,
    });
    const form = new FormData();
    form.set("finderSubmissionId", submissionId);
    form.set("selectedDesignId", "55555555-5555-4555-8555-555555555555");

    const result = await confirmShowcaseStudioVariantAction(
      { ...initialShowcaseStudioPanelActionState, status: "needs_confirmation", submissionId, candidates: [candidate] },
      form,
    );

    expect(submitIntake).not.toHaveBeenCalled();
    expect(result).toMatchObject({ status: "needs_confirmation", retryable: false });
  });

  it("confirms only an offered exact design and persists Suite's agreeing result", async () => {
    readSubmissionRow.mockResolvedValue({
      row: { status: "needs_confirmation", extracted_catalog: { variantCandidates: [candidate] } },
      error: null,
    });
    submitIntake.mockResolvedValue({
      ok: true,
      status: "accepted",
      retryable: false,
      mutationReplayed: false,
      message: "Exact design accepted.",
      suiteDesignId: designId,
      resolvedDesign: candidate,
    });
    const form = new FormData();
    form.set("finderSubmissionId", submissionId);
    form.set("selectedDesignId", designId);

    const result = await confirmShowcaseStudioVariantAction(
      { ...initialShowcaseStudioPanelActionState, status: "needs_confirmation", submissionId, candidates: [candidate] },
      form,
    );

    expect(submitIntake).toHaveBeenCalledWith({ action: "confirm", finderSubmissionId: submissionId, selectedDesignId: designId });
    expect(persistBridgeOutcome).toHaveBeenCalledWith(
      { marker: "service" },
      expect.objectContaining({ outcome: expect.objectContaining({ status: "accepted", suiteCatalogDesignId: designId }) }),
    );
    expect(result).toMatchObject({ status: "accepted", selectedDesign: candidate });
  });
});

function studioFormData(): FormData {
  const form = new FormData();
  form.set("finderSubmissionId", submissionId);
  form.set("itemNumber", "RBP5902");
  form.set("mainStone", "Rose Quartz");
  form.set("material", "Rose gold");
  form.set("rarityClassification", "standard");
  form.set("customerNote", "Original label is readable.");
  form.set("originalLabelPhoto", new File([jpegBytes()], "label.jpg", { type: "image/jpeg" }));
  form.set("jewelryFrontPhoto", new File([jpegBytes()], "jewelry.jpg", { type: "image/jpeg" }));
  return form;
}

function jpegBytes(): Uint8Array {
  return new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
}
