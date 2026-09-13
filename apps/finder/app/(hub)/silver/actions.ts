"use server";

import { Buffer } from "node:buffer";
import { revalidatePath } from "next/cache";
import { getCurrentSparkleFinderAccount } from "@/lib/sparkle-finder/account-service";
import {
  persistCollectionItemForAccount,
  persistShowcasePieceForAccount,
  persistSilverProfileForAccount,
  type SupabaseCustomerStateClient,
} from "@/lib/sparkle-finder/customer-state";
import {
  persistShowcaseStudioSubmissionForAccount,
  type ShowcaseStudioSubmissionFailureReason,
  type SupabaseShowcaseStudioClient,
} from "@/lib/sparkle-finder/showcase-studio-state";
import {
  submitShowcaseStudioIntake,
  type ShowcaseStudioResult,
} from "@/lib/sparkle-finder/showcase-studio";
import {
  asRecord as asStudioPersistenceRecord,
  persistShowcaseStudioBridgeOutcomeForOwner,
  readShowcaseStudioSubmissionRow,
  reconstructShowcaseStudioRetryForOwner,
  type ShowcaseStudioBridgePersistenceInput,
  type ShowcaseStudioPersistenceClient,
  type ShowcaseStudioPhotoEvidence,
  type ShowcaseStudioRetryReconstructionResult,
} from "@/lib/sparkle-finder/showcase-studio-persistence";
import {
  initialShowcaseStudioPanelActionState,
  type ShowcaseStudioPanelActionState,
} from "@/lib/sparkle-finder/showcase-studio-workflow-types";
import { getCatalogJewelryItemById } from "@/lib/sparkle-finder/catalog-service";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import type { CollectionItem } from "@/lib/sparkle-finder/types";
import type { SparkleShowcaseItemStatus, SparkleShowcaseVisibility } from "@/lib/sparkle-finder/showcase-types";

export type SilverSaveActionState = {
  status: "idle" | "saved" | "denied" | "error";
  message: string;
};

type SparkleFinderSilverServerClient = SupabaseCustomerStateClient & {
  auth: {
    getUser: () => Promise<{ data: { user: { id: string } | null }; error: unknown }>;
  };
};

const profilePhotoMaxBytes = 500 * 1024;
const profilePhotoDataUrlMaxCharacters = 700_000;
const profilePhotoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function saveSilverProfileAction(
  _previousState: SilverSaveActionState,
  formData: FormData,
): Promise<SilverSaveActionState> {
  const verified = await getVerifiedSilverClient();

  if (!verified.ok) {
    return verified.state;
  }

  const profilePhoto = await readOptionalProfilePhotoDataUrl(
    formData.get("profilePhoto"),
    formData.get("profilePhotoDataUrl"),
  );

  if (!profilePhoto.ok) {
    return profilePhoto.state;
  }

  const displayName = String(formData.get("displayName") ?? "").trim();

  if (!displayName) {
    return {
      status: "error",
      message: "Display name is required.",
    };
  }

  const result = await persistSilverProfileForAccount(verified.client, verified.accountState, {
    bio: String(formData.get("bio") ?? ""),
    displayName,
    ...(profilePhoto.photoUrl ? { photoUrl: profilePhoto.photoUrl } : {}),
    tiktokHandle: String(formData.get("tiktokHandle") ?? ""),
    visibility: formData.get("visibility") === "sparkle_finder" ? "sparkle_finder" : "private",
  });

  if (!result.ok) {
    return {
      status: result.reason === "silver_required" ? "denied" : "error",
      message: result.reason === "silver_required" ? "Silver access is required to save profile updates." : "Profile could not be saved.",
    };
  }

  revalidatePath("/silver");
  revalidatePath("/account");
  revalidatePath("/");

  return {
    status: "saved",
    message: "Profile saved.",
  };
}

export async function saveSilverCollectionItemAction(
  _previousState: SilverSaveActionState,
  formData: FormData,
): Promise<SilverSaveActionState> {
  const verified = await getVerifiedSilverClient();

  if (!verified.ok) {
    return verified.state;
  }

  const state = parseCollectionState(formData.get("state"));
  const jewelryItemId = String(formData.get("jewelryItemId") ?? "").trim();

  if (!jewelryItemId) {
    return {
      status: "error",
      message: "Collection item could not be saved.",
    };
  }

  if (!(await getCatalogJewelryItemById(jewelryItemId, { useFixtureFallback: false }))) {
    return {
      status: "denied",
      message: "Collection item is not available in the Sparkle Finder library.",
    };
  }

  const result = await persistCollectionItemForAccount(verified.client, verified.accountState, {
    jewelryItemId,
    state,
    note: String(formData.get("note") ?? ""),
    isHighlighted: formData.get("isHighlighted") === "yes",
    showcaseCollectionTitle: String(formData.get("showcaseCollectionTitle") ?? ""),
    acquisitionSource: parseAcquisitionSource(formData.get("acquisitionSource")),
    acquisitionContext: parseAcquisitionContext(formData.get("acquisitionContext")),
  });

  if (!result.ok) {
    return {
      status: result.reason === "silver_required" ? "denied" : "error",
      message:
        result.reason === "silver_required" ? "Silver access is required to save collection updates." : "Collection could not be saved.",
    };
  }

  revalidatePath("/silver");

  return {
    status: "saved",
    message: state === "wishlist" ? "Wishlist saved." : "Collection saved.",
  };
}

export async function saveShowcasePieceAction(
  _previousState: SilverSaveActionState,
  formData: FormData,
): Promise<SilverSaveActionState> {
  const verified = await getVerifiedSilverClient();

  if (!verified.ok) {
    return verified.state;
  }

  const jewelryItemId = String(formData.get("jewelryItemId") ?? "").trim();

  if (!jewelryItemId) {
    return {
      status: "error",
      message: "Sparkle Showcase piece could not be saved.",
    };
  }

  if (!(await getCatalogJewelryItemById(jewelryItemId, { useFixtureFallback: false }))) {
    return {
      status: "denied",
      message: "Sparkle Showcase piece is not available in the Sparkle Finder library.",
    };
  }

  const piecePhoto = await readOptionalProfilePhotoDataUrl(
    formData.get("personalPhoto"),
    formData.get("personalPhotoDataUrl"),
    "Personal piece photo",
  );

  if (!piecePhoto.ok) {
    return piecePhoto.state;
  }

  const removePersonalPhoto = formData.get("removePersonalPhoto") === "yes";
  const personalPhotoUrl = removePersonalPhoto ? "" : piecePhoto.photoUrl;

  const result = await persistShowcasePieceForAccount(verified.client, verified.accountState, {
    jewelryItemId,
    note: String(formData.get("note") ?? ""),
    showcaseStatus: parseShowcaseStatus(formData.get("showcaseStatus")),
    visibility: parseShowcaseVisibility(formData.get("visibility")),
    revealStory: String(formData.get("revealStory") ?? ""),
    isRarestReveal: formData.get("isRarestReveal") === "yes",
    ...(personalPhotoUrl !== undefined ? { personalPhotoUrl } : {}),
  });

  if (!result.ok) {
    return {
      status: result.reason === "silver_required" ? "denied" : "error",
      message:
        result.reason === "silver_required" ? "Silver access is required to save Sparkle Showcase updates." : "Sparkle Showcase piece could not be saved.",
    };
  }

  revalidatePath("/silver");
  revalidatePath("/showcase", "layout");

  return {
    status: "saved",
    message: "Sparkle Showcase piece saved.",
  };
}

export async function submitShowcaseStudioRequestAction(
  previousState: ShowcaseStudioPanelActionState,
  formData: FormData,
): Promise<ShowcaseStudioPanelActionState> {
  const verified = await getVerifiedSilverClient();

  if (!verified.ok) {
    return studioDeniedState(previousState, verified.state.message);
  }

  const submissionId = readFormText(formData, "finderSubmissionId");
  const serviceClient = getShowcaseStudioServiceClient();
  if (!serviceClient) {
    return studioDeniedState(
      previousState,
      "Showcase Studio cannot save private photos right now. Please try again shortly.",
    );
  }
  const originalLabelPhoto = readUploadFile(formData.get("originalLabelPhoto"));
  const jewelryFrontPhoto = readUploadFile(formData.get("jewelryFrontPhoto"));
  const itemNumber = readFormText(formData, "itemNumber");
  const mainStone = readFormText(formData, "mainStone");
  const material = readFormText(formData, "material");
  const rarityClassification = readRarityClassification(formData);
  const customerNote = readFormText(formData, "customerNote");
  if (!rarityClassification) {
    return studioDeniedState(previousState, "Please answer whether this piece is a Diamond or Unicorn.");
  }

  const result = await persistShowcaseStudioSubmissionForAccount(
    serviceClient as unknown as SupabaseShowcaseStudioClient,
    verified.accountState,
    {
    customerNote,
    itemNumber,
    jewelryFrontPhoto,
    mainStone,
    material,
    originalLabelPhoto,
    rarityClassification,
    submissionId,
    },
  );

  if (!result.ok) {
    return studioPersistenceFailureState(previousState, result.reason, result.submissionId ?? submissionId);
  }

  return runShowcaseStudioResolve({
    customerNote,
    itemNumber,
    mainStone,
    material,
    rarityClassification,
    ownerId: verified.accountState.customer.id,
    photoEvidence: result.photoEvidence,
    previousState,
    submissionId: result.submissionId,
  });
}

export async function retryShowcaseStudioRequestAction(
  previousState: ShowcaseStudioPanelActionState,
  formData: FormData,
): Promise<ShowcaseStudioPanelActionState> {
  const verified = await getVerifiedSilverClient();
  if (!verified.ok) return studioDeniedState(previousState, verified.state.message);

  const submissionId = readFormText(formData, "finderSubmissionId");
  const serviceClient = getShowcaseStudioServiceClient();
  if (!serviceClient) {
    return savedPendingStudioState(previousState, submissionId);
  }
  const retry = await reconstructShowcaseStudioRetryForOwner(serviceClient, {
    ownerId: verified.accountState.customer.id,
    submissionId,
  });
  if (!retry.ok) {
    return {
      ...previousState,
      status: "error",
      message: getShowcaseStudioRetryFailureMessage(retry.reason),
      submissionId: submissionId || previousState.submissionId,
      retryable: retry.reason === "asset_download_failed" || retry.reason === "database_read_failed",
    };
  }

  return runShowcaseStudioResolve({
    customerNote: retry.customerNote,
    itemNumber: retry.itemNumber,
    mainStone: retry.mainStone ?? "",
    material: retry.material ?? "",
    rarityClassification: retry.rarityClassification,
    ownerId: verified.accountState.customer.id,
    photoEvidence: retry.photoEvidence,
    previousState,
    submissionId: retry.submissionId,
  });
}

export async function confirmShowcaseStudioVariantAction(
  previousState: ShowcaseStudioPanelActionState,
  formData: FormData,
): Promise<ShowcaseStudioPanelActionState> {
  const verified = await getVerifiedSilverClient();
  if (!verified.ok) return studioDeniedState(previousState, verified.state.message);

  const submissionId = readFormText(formData, "finderSubmissionId");
  const selectedDesignId = readFormText(formData, "selectedDesignId");
  const serviceClient = getShowcaseStudioServiceClient();
  if (!serviceClient) {
    return confirmationRetryState(previousState, submissionId, "Exact design confirmation is unavailable right now. Please try again.");
  }

  const persisted = await readShowcaseStudioSubmissionRow(
    serviceClient,
    verified.accountState.customer.id,
    submissionId,
  );
  if (
    persisted.error
    || !persisted.row
    || persisted.row.status !== "needs_confirmation"
    || !persistedCandidateIds(persisted.row.extracted_catalog).has(selectedDesignId)
  ) {
    return confirmationRetryState(
      previousState,
      submissionId,
      "That exact design is not available for this Studio request. Review the choices and try again.",
    );
  }

  const suiteResult = await submitShowcaseStudioIntake({
    action: "confirm",
    finderSubmissionId: submissionId,
    selectedDesignId,
  });
  if (!suiteResult.ok && suiteResult.retryable) {
    return confirmationRetryState(previousState, submissionId, suiteResult.message);
  }

  const persistedResult = await persistStudioBridgeResult(
    serviceClient,
    verified.accountState.customer.id,
    submissionId,
    suiteResult,
    "confirm",
  );
  if (!persistedResult) {
    return confirmationRetryState(
      previousState,
      submissionId,
      "The exact design response could not be saved safely. Please try the confirmation again.",
    );
  }

  revalidatePath("/silver");
  return studioPanelStateFromResult(previousState, submissionId, suiteResult, "confirm");
}

async function runShowcaseStudioResolve(input: {
  customerNote: string;
  itemNumber: string;
  mainStone: string;
  material: string;
  rarityClassification: "standard" | "diamond" | "unicorn";
  ownerId: string;
  photoEvidence: ShowcaseStudioPhotoEvidence;
  previousState: ShowcaseStudioPanelActionState;
  submissionId: string;
}): Promise<ShowcaseStudioPanelActionState> {
  const serviceClient = getShowcaseStudioServiceClient();
  if (!serviceClient) return savedPendingStudioState(input.previousState, input.submissionId);

  const suiteIntakeResult = await submitShowcaseStudioIntake({
    action: "resolve",
    finderSubmissionId: input.submissionId,
    labelDetails: {
      itemNumber: input.itemNumber,
      bpLabel: input.rarityClassification,
      ...(input.mainStone ? { mainStone: input.mainStone } : {}),
      ...(input.material ? { material: input.material } : {}),
    },
    customerNote: input.customerNote,
    photoEvidence: [...input.photoEvidence] as [
      ShowcaseStudioPhotoEvidence[0],
      ShowcaseStudioPhotoEvidence[1],
    ],
  });

  const persisted = await persistStudioBridgeResult(
    serviceClient,
    input.ownerId,
    input.submissionId,
    suiteIntakeResult,
    "resolve",
  );
  if (!persisted) return savedPendingStudioState(input.previousState, input.submissionId);

  revalidatePath("/silver");
  return studioPanelStateFromResult(input.previousState, input.submissionId, suiteIntakeResult, "resolve");
}

function readRarityClassification(formData: FormData): "standard" | "diamond" | "unicorn" | null {
  const value = readFormText(formData, "rarityClassification");
  return value === "standard" || value === "diamond" || value === "unicorn" ? value : null;
}

async function getVerifiedSilverClient(): Promise<
  | {
      ok: true;
      client: SparkleFinderSilverServerClient;
      accountState: Extract<Awaited<ReturnType<typeof getCurrentSparkleFinderAccount>>, { status: "authenticated" }>;
    }
  | {
      ok: false;
      state: SilverSaveActionState;
    }
> {
  let client: SparkleFinderSilverServerClient;

  try {
    client = (await createClient()) as unknown as SparkleFinderSilverServerClient;
  } catch {
    return {
      ok: false,
      state: {
        status: "error",
        message: "Account saves are unavailable right now.",
      },
    };
  }

  const { data, error } = await client.auth.getUser();

  if (error || !data.user) {
    return {
      ok: false,
      state: {
        status: "denied",
        message: "Sign in to save Silver updates.",
      },
    };
  }

  const accountState = await getCurrentSparkleFinderAccount({
    isSupabaseConfigured: () => true,
    createSupabaseClient: async () => client,
  });

  if (accountState.status !== "authenticated" || accountState.customer.id !== data.user.id) {
    return {
      ok: false,
      state: {
        status: "denied",
        message: "Sign in to save Silver updates.",
      },
    };
  }

  return {
    ok: true,
    client,
    accountState: accountState as Extract<typeof accountState, { status: "authenticated" }>,
  };
}

function parseCollectionState(value: FormDataEntryValue | null): CollectionItem["state"] {
  if (value === "wishlist" || value === "private_note_only") {
    return value;
  }

  return "owned";
}

function parseAcquisitionSource(value: FormDataEntryValue | null): CollectionItem["acquisitionSource"] | undefined {
  if (
    value === "manual" ||
    value === "wishlist" ||
    value === "sparkle_finder_lead" ||
    value === "nic_nac_request" ||
    value === "unknown"
  ) {
    return value;
  }

  return undefined;
}

function parseAcquisitionContext(value: FormDataEntryValue | null): Record<string, unknown> | undefined {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value);

    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}

function parseShowcaseStatus(value: FormDataEntryValue | null): SparkleShowcaseItemStatus {
  if (value === "wishlist" || value === "iso" || value === "private_note_only") {
    return value;
  }

  return "owned";
}

function parseShowcaseVisibility(value: FormDataEntryValue | null): SparkleShowcaseVisibility {
  return value === "public" ? "public" : "private";
}

function readUploadFile(value: FormDataEntryValue | null): File {
  return value instanceof File ? value : new File([], "missing.jpg", { type: "image/jpeg" });
}

function readFormText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function getShowcaseStudioServiceClient(): ShowcaseStudioPersistenceClient | null {
  return createSupabaseServiceRoleClient() as unknown as ShowcaseStudioPersistenceClient | null;
}

async function persistStudioBridgeResult(
  client: ShowcaseStudioPersistenceClient,
  ownerId: string,
  submissionId: string,
  result: ShowcaseStudioResult,
  phase: "resolve" | "confirm",
): Promise<boolean> {
  const outcome = studioPersistenceOutcome(result, phase);
  if (!outcome) return true;
  const persisted = await persistShowcaseStudioBridgeOutcomeForOwner(client, {
    outcome,
    ownerId,
    submissionId,
  });
  return persisted.ok;
}

function studioPersistenceOutcome(
  result: ShowcaseStudioResult,
  phase: "resolve" | "confirm",
): ShowcaseStudioBridgePersistenceInput | null {
  if (result.ok && result.status === "needs_variant_confirmation") {
    return {
      status: "needs_confirmation",
      extractedCatalog: {
        schemaVersion: 2,
        mutationReplayed: result.mutationReplayed,
        variantCandidates: result.variantCandidates,
      },
    };
  }
  if (result.ok && (result.status === "accepted" || result.status === "published")) {
    return {
      status: result.status,
      suiteCatalogDesignId: result.suiteDesignId,
      designName: result.resolvedDesign.designName,
      jewelryType: result.resolvedDesign.jewelryType,
      collectionName: result.resolvedDesign.collectionName,
      collectionYear: result.resolvedDesign.collectionYear,
      mainStone: result.resolvedDesign.mainStone,
      material: result.resolvedDesign.material,
      extractedCatalog: {
        schemaVersion: 2,
        mutationReplayed: result.mutationReplayed,
        resolvedDesign: result.resolvedDesign,
      },
    };
  }
  if (result.ok && result.status === "publish_queued") {
    return {
      status: "publish_queued",
      bpLabel: result.catalogDraft.bpLabel,
      collectionName: result.catalogDraft.collectionName,
      collectionYear: result.catalogDraft.collectionYear,
      designName: result.catalogDraft.designName,
      jewelryType: result.catalogDraft.jewelryType,
      mainStone: result.catalogDraft.mainStone,
      material: result.catalogDraft.material,
      extractedCatalog: {
        schemaVersion: 2,
        mutationReplayed: result.mutationReplayed,
        catalogDraft: result.catalogDraft,
      },
    };
  }

  if (result.ok) return null;
  if (phase === "confirm" && result.retryable) return null;
  if (result.status === "invalid_selection") {
    return phase === "confirm"
      ? null
      : { status: "rejected", lastError: `${result.status}:${result.errorCode}` };
  }
  if (result.status === "conflicting_replay") {
    return { status: "rejected", lastError: `${result.status}:${result.errorCode}` };
  }
  if (result.status === "photo_rejected") {
    return {
      status: "photo_rejected",
      lastError: `${result.status}:${result.errorCode}`,
      photoFeedback: result.photoFeedback,
    };
  }
  if (result.status === "invalid_details") {
    return { status: "rejected", lastError: `${result.status}:${result.errorCode}` };
  }
  return {
    status: result.retryable ? "saved_pending_sync" : "publish_failed",
    lastError: `${result.status}:${result.errorCode}`,
  };
}

function studioPanelStateFromResult(
  previousState: ShowcaseStudioPanelActionState,
  submissionId: string,
  result: ShowcaseStudioResult,
  phase: "resolve" | "confirm",
): ShowcaseStudioPanelActionState {
  if (result.ok && result.status === "needs_variant_confirmation") {
    return {
      status: "needs_confirmation",
      message: result.message,
      submissionId,
      retryable: false,
      candidates: result.variantCandidates,
      selectedDesign: null,
    };
  }
  if (result.ok && (result.status === "accepted" || result.status === "published")) {
    return {
      status: result.status,
      message: result.message,
      submissionId,
      retryable: false,
      candidates: [],
      selectedDesign: result.resolvedDesign,
    };
  }
  if (result.ok && result.status === "publish_queued") {
    return {
      status: "publish_queued",
      message: result.message,
      submissionId,
      retryable: false,
      candidates: [],
      selectedDesign: null,
    };
  }
  if (result.ok) return { ...initialShowcaseStudioPanelActionState, submissionId };

  if (phase === "confirm" && result.retryable) {
    return confirmationRetryState(previousState, submissionId, result.message);
  }
  const status = result.status === "photo_rejected"
    ? "photo_rejected"
    : result.status === "invalid_details"
      ? "invalid_details"
      : result.status === "invalid_selection"
        ? "invalid_selection"
        : result.retryable
          ? "saved_pending_sync"
          : "error";
  return {
    ...previousState,
    status,
    message: result.message,
    submissionId,
    retryable: result.retryable,
    candidates: status === "invalid_selection" ? previousState.candidates : [],
    selectedDesign: null,
  };
}

function savedPendingStudioState(
  previousState: ShowcaseStudioPanelActionState,
  submissionId: string,
): ShowcaseStudioPanelActionState {
  return {
    ...previousState,
    status: "saved_pending_sync",
    message: "Your photos are saved safely. Showcase Studio could not sync them to Sparkle Suite yet, so you can retry without uploading again.",
    submissionId: submissionId || previousState.submissionId,
    retryable: true,
    selectedDesign: null,
  };
}

function confirmationRetryState(
  previousState: ShowcaseStudioPanelActionState,
  submissionId: string,
  message: string,
): ShowcaseStudioPanelActionState {
  return {
    ...previousState,
    status: "needs_confirmation",
    message,
    submissionId: submissionId || previousState.submissionId,
    retryable: false,
    selectedDesign: null,
  };
}

function studioDeniedState(
  previousState: ShowcaseStudioPanelActionState,
  message: string,
): ShowcaseStudioPanelActionState {
  return {
    ...previousState,
    status: "error",
    message,
    retryable: false,
  };
}

function studioPersistenceFailureState(
  previousState: ShowcaseStudioPanelActionState,
  reason: ShowcaseStudioSubmissionFailureReason,
  submissionId: string,
): ShowcaseStudioPanelActionState {
  return {
    ...previousState,
    status: reason === "submission_conflict"
      ? "rejected"
      : reason === "invalid_file_type" || reason === "file_too_large" || reason === "invalid_image_dimensions"
        ? "photo_rejected"
        : "error",
    message: getShowcaseStudioFailureMessage(reason),
    submissionId: submissionId || previousState.submissionId,
    retryable: false,
    candidates: [],
    selectedDesign: null,
  };
}

function persistedCandidateIds(value: unknown): Set<string> {
  const record = asStudioPersistenceRecord(value);
  const candidates = Array.isArray(record?.variantCandidates) ? record.variantCandidates : [];
  return new Set(candidates.flatMap((candidate) => {
    const candidateRecord = asStudioPersistenceRecord(candidate);
    const designId = typeof candidateRecord?.designId === "string" ? candidateRecord.designId.trim() : "";
    return designId ? [designId] : [];
  }));
}

async function readOptionalProfilePhotoDataUrl(
  value: FormDataEntryValue | null,
  preparedValue: FormDataEntryValue | null = null,
  photoLabel = "Profile photo",
): Promise<{ ok: true; photoUrl?: string } | { ok: false; state: SilverSaveActionState }> {
  const preparedPhotoUrl = typeof preparedValue === "string" ? preparedValue.trim() : "";

  if (preparedPhotoUrl) {
    return validatePreparedProfilePhotoDataUrl(preparedPhotoUrl, photoLabel);
  }

  if (!(value instanceof File) || value.size === 0) {
    return { ok: true };
  }

  if (!profilePhotoTypes.has(value.type)) {
    return {
      ok: false,
      state: {
        status: "error",
        message: `${photoLabel} must be a JPG, PNG, or WebP.`,
      },
    };
  }

  if (value.size > profilePhotoMaxBytes) {
    return {
      ok: false,
      state: {
        status: "error",
        message: `${photoLabel} must be 500 KB or smaller.`,
      },
    };
  }

  try {
    return {
      ok: true,
      photoUrl: await fileToDataUrl(value),
    };
  } catch {
    return {
      ok: false,
      state: {
        status: "error",
        message: `${photoLabel} could not be saved.`,
      },
    };
  }
}

function validatePreparedProfilePhotoDataUrl(
  photoUrl: string,
  photoLabel = "Profile photo",
): { ok: true; photoUrl: string } | { ok: false; state: SilverSaveActionState } {
  if (!/^data:image\/(jpeg|png|webp);base64,[a-z0-9+/]+=*$/i.test(photoUrl)) {
    return {
      ok: false,
      state: {
        status: "error",
        message: `${photoLabel} could not be prepared. Choose a JPG, PNG, or WebP.`,
      },
    };
  }

  if (photoUrl.length > profilePhotoDataUrlMaxCharacters) {
    return {
      ok: false,
      state: {
        status: "error",
        message: `${photoLabel} is too large. Try a smaller image.`,
      },
    };
  }

  return {
    ok: true,
    photoUrl,
  };
}

async function fileToDataUrl(file: File): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer());

  return `data:${file.type || "application/octet-stream"};base64,${bytes.toString("base64")}`;
}

function getShowcaseStudioFailureMessage(reason: ShowcaseStudioSubmissionFailureReason): string {
  if (reason === "silver_required") {
    return "Silver access is required to submit Showcase Studio requests.";
  }

  if (reason === "original_label_required") {
    return "Original Bomb Party label photo is required.";
  }

  if (reason === "jewelry_photo_required") {
    return "Light-box jewelry photo is required.";
  }

  if (reason === "invalid_file_type") {
    return "Upload image files for the label and jewelry photo.";
  }

  if (reason === "file_too_large") {
    return "Each prepared Studio image must be 1.5 MB or smaller.";
  }

  if (reason === "invalid_image_dimensions") {
    return "A prepared Studio image has invalid dimensions. Choose the photo again and retry.";
  }

  if (reason === "invalid_submission_id") {
    return "This Studio request could not be identified safely. Refresh the page and try again.";
  }

  if (reason === "submission_conflict") {
    return "This Studio request already contains different details. Refresh to see its saved status.";
  }

  if (reason === "original_label_storage_failed" || reason === "jewelry_storage_failed") {
    return "A Studio photo could not be stored safely. No photo-quality decision was made.";
  }

  if (reason === "asset_metadata_failed" || reason === "database_create_failed" || reason === "database_read_failed" || reason === "finalize_failed") {
    return "The Studio request could not be saved to your account. No photo-quality decision was made.";
  }

  if (reason === "cleanup_failed") {
    return "The Studio request stopped before submission and needs support before another upload.";
  }

  return "Showcase Studio request could not be saved.";
}

function getShowcaseStudioRetryFailureMessage(
  reason: Extract<ShowcaseStudioRetryReconstructionResult, { ok: false }>["reason"],
): string {
  if (reason === "retry_not_allowed") {
    return "This Studio request is not waiting for a retry. Refresh to see its latest status.";
  }
  if (reason === "owner_not_found" || reason === "invalid_submission_id") {
    return "That Studio request does not belong to this signed-in account.";
  }
  if (reason === "asset_metadata_invalid") {
    return "The saved Studio photos could not be verified safely. They were not sent to Sparkle Suite.";
  }
  if (reason === "asset_download_failed") {
    return "The saved Studio photos could not be read right now. Please retry shortly.";
  }
  return "The saved Studio request could not be read right now. Please retry shortly.";
}
