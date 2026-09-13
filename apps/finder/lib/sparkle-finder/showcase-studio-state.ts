import type { CurrentSparkleFinderAccountState } from "./account-service";
import {
  buildShowcaseStudioAssetPath,
  areSaneShowcaseStudioImageDimensions,
  compareAndSetShowcaseStudioSubmission,
  isShowcaseStudioImageType,
  isStableShowcaseStudioSubmissionId,
  normalizeShowcaseStudioSubmissionId,
  readShowcaseStudioPhotoEvidenceForOwner,
  readShowcaseStudioImageDimensions,
  readShowcaseStudioSubmissionRow,
  readString as readPersistenceString,
  showcaseStudioBucket,
  showcaseStudioMaxImageBytes,
  type ShowcaseStudioDatabaseResult,
  type ShowcaseStudioPersistenceClient,
  type ShowcaseStudioPersistenceRow,
  type ShowcaseStudioPhotoEvidence,
} from "./showcase-studio-persistence";

export type ShowcaseStudioSubmissionInput = {
  customerNote: string;
  itemNumber: string;
  jewelryFrontPhoto: File;
  mainStone?: string;
  material?: string;
  originalLabelPhoto: File;
  rarityClassification: "standard" | "diamond" | "unicorn";
  submissionId: string;
};

export type ShowcaseStudioSubmissionFailureReason =
  | "asset_metadata_failed"
  | "cleanup_failed"
  | "database_create_failed"
  | "database_read_failed"
  | "file_too_large"
  | "finalize_failed"
  | "invalid_file_type"
  | "invalid_image_dimensions"
  | "invalid_submission_id"
  | "jewelry_storage_failed"
  | "jewelry_photo_required"
  | "original_label_storage_failed"
  | "original_label_required"
  | "silver_required"
  | "submission_conflict";

export type ShowcaseStudioSubmissionResult =
  | {
      ok: true;
      evidenceCommitted: true;
      photoEvidence: ShowcaseStudioPhotoEvidence;
      resumed: boolean;
      status: Exclude<ShowcaseStudioPersistedIntakeStatus, "draft" | "uploading">;
      submissionId: string;
    }
  | {
      ok: false;
      reason: ShowcaseStudioSubmissionFailureReason;
      stageFailure?: Exclude<ShowcaseStudioSubmissionFailureReason, "cleanup_failed">;
      submissionId?: string;
    };

type ShowcaseStudioSubmissionOptions = {
  now?: () => Date;
};

type SupabaseReadResult = PromiseLike<{ data: unknown; error: unknown }>;

export type ShowcaseStudioUploadRole = "original_label" | "jewelry_front";

export type ShowcaseStudioUploadRoleStatus = {
  role: ShowcaseStudioUploadRole;
  label: string;
  present: boolean;
  qualityStatus: "pending" | "accepted" | "rejected" | null;
  feedback: string[];
};

export type ShowcaseStudioPersistedIntakeStatus =
  | "draft"
  | "uploading"
  | "submitted"
  | "needs_label"
  | "needs_confirmation"
  | "needs_jewelry_photo"
  | "photo_rejected"
  | "saved_pending_sync"
  | "accepted"
  | "publish_queued"
  | "published"
  | "rejected"
  | "publish_failed";

export type ShowcaseStudioLatestSubmissionStatus = {
  status: ShowcaseStudioPersistedIntakeStatus;
  submissionId: string;
  suiteCatalogDesignId: string | null;
  variantCandidates: ShowcaseStudioPersistedVariantCandidate[];
  selectedDesign: ShowcaseStudioPersistedVariantCandidate | null;
  failureCategory: ShowcaseStudioCustomerSafeFailureCategory;
  itemNumber: string | null;
  designName: string | null;
  jewelryType: string | null;
  collectionName: string | null;
  collectionYear: number | null;
  mainStone: string | null;
  material: string | null;
  bpLabel: string | null;
  customerNoteSnippet: string | null;
  photoFeedback: string[];
  submittedAt: string | null;
  acceptedAt: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
};

export type ShowcaseStudioCustomerSafeFailureCategory =
  | "invalid_details"
  | "missing_evidence"
  | "photo_quality"
  | "publish"
  | "temporary_sync"
  | null;

export type ShowcaseStudioPersistedVariantCandidate = {
  canonicalPhotoUrl: string | null;
  collectionName: string | null;
  collectionYear: number | null;
  description: string | null;
  designId: string;
  designName: string;
  itemNumber: string;
  jewelryType: string;
  mainStone: string | null;
  material: string | null;
};

export type ShowcaseStudioIntakeStatusReadResult = {
  status: "connected" | "unavailable";
  dataSource: "persisted";
  hasSubmittedIntake: boolean;
  requiredUploadRoles: ShowcaseStudioUploadRoleStatus[];
  missingUploadRoles: ShowcaseStudioUploadRole[];
  studioUploadHref: "/silver#showcase-studio";
  canContinueFromChat: false;
  nextAction: "open_studio_upload_flow" | "report_existing_status";
  latestSubmission: ShowcaseStudioLatestSubmissionStatus | null;
  guidance: string;
};

export type SupabaseShowcaseStudioClient = ShowcaseStudioPersistenceClient;

export type SupabaseShowcaseStudioReadClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => SupabaseReadResult;
    };
  };
};

const studioUploadHref = "/silver#showcase-studio" as const;
const studioSubmissionColumns =
  "id,user_id,status,item_number,design_name,jewelry_type,collection_name,collection_year,main_stone,material,bp_label,customer_note,photo_feedback,submitted_at,accepted_at,published_at,created_at,updated_at,suite_catalog_design_id,extracted_catalog,last_error";
const studioAssetColumns =
  "id,submission_id,user_id,asset_kind,content_type,byte_size,nic_nac_quality_status,nic_nac_quality_feedback,created_at";
const requiredUploadRoleDefinitions: Array<{
  role: ShowcaseStudioUploadRole;
  label: string;
}> = [
  {
    role: "original_label",
    label: "original Bomb Party label/details photo",
  },
  {
    role: "jewelry_front",
    label: "clear customer-facing jewelry photo",
  },
];

export async function persistShowcaseStudioSubmissionForAccount(
  supabase: SupabaseShowcaseStudioClient,
  accountState: CurrentSparkleFinderAccountState,
  input: ShowcaseStudioSubmissionInput,
  options: ShowcaseStudioSubmissionOptions = {},
): Promise<ShowcaseStudioSubmissionResult> {
  if (!canSaveSilverState(accountState)) {
    return { ok: false, reason: "silver_required" };
  }

  if (!isStableShowcaseStudioSubmissionId(input.submissionId)) {
    return { ok: false, reason: "invalid_submission_id" };
  }

  const originalLabelValidation = await validateStudioImage(input.originalLabelPhoto, "original_label_required");

  if (!originalLabelValidation.ok) {
    return { ok: false, reason: originalLabelValidation.reason };
  }

  const jewelryPhotoValidation = await validateStudioImage(input.jewelryFrontPhoto, "jewelry_photo_required");

  if (!jewelryPhotoValidation.ok) {
    return { ok: false, reason: jewelryPhotoValidation.reason };
  }

  const submissionId = normalizeShowcaseStudioSubmissionId(input.submissionId);
  const ownerId = accountState.customer.id;
  const submittedAt = (options.now?.() ?? new Date()).toISOString();
  const originalLabelPath = buildShowcaseStudioAssetPath(
    ownerId,
    submissionId,
    "original_label",
    input.originalLabelPhoto.type,
  );
  const jewelryPhotoPath = buildShowcaseStudioAssetPath(
    ownerId,
    submissionId,
    "jewelry_front",
    input.jewelryFrontPhoto.type,
  );
  const storagePaths = [originalLabelPath, jewelryPhotoPath];

  const draft = await createOrResumeStudioDraft(supabase, {
    customerNote: cleanText(input.customerNote, 500),
    itemNumber: cleanText(input.itemNumber, 80),
    mainStone: cleanText(input.mainStone, 120),
    material: cleanText(input.material, 120),
    rarityClassification: input.rarityClassification,
    ownerId,
    submissionId,
  });
  if (!draft.ok) {
    return { ...draft, submissionId };
  }
  if (draft.status === "uploading") {
    return { ok: false, reason: "submission_conflict", submissionId };
  }
  if (draft.status === "publish_failed") {
    return { ok: false, reason: "submission_conflict", submissionId };
  }
  if (draft.status !== "draft") {
    return committedStudioSubmissionSuccessIfEvidenceMatches(supabase, {
      input,
      ownerId,
      resumed: true,
      status: draft.status,
      submissionId,
    });
  }

  const claimed = await runCompareAndSetOperation(() => compareAndSetShowcaseStudioSubmission(supabase, {
    expectedStatus: "draft",
    ownerId,
    submissionId,
    values: { status: "uploading" },
  }));
  if (claimed.error) {
    return { ok: false, reason: "database_create_failed", submissionId };
  }
  if (!claimed.row || readPersistedSubmissionStatus(claimed.row.status) !== "uploading") {
    const raced = await runOwnerSubmissionRead(supabase, ownerId, submissionId);
    if (raced.error) return { ok: false, reason: "database_read_failed", submissionId };
    if (!raced.row) return { ok: false, reason: "submission_conflict", submissionId };
    const validatedRace = validateResumableStudioRow(raced.row, {
      customerNote: cleanText(input.customerNote, 500),
      itemNumber: cleanText(input.itemNumber, 80),
      mainStone: cleanText(input.mainStone, 120),
      material: cleanText(input.material, 120),
      rarityClassification: input.rarityClassification,
      ownerId,
      submissionId,
    }, true);
    if (
      !validatedRace.ok
      || validatedRace.status === "draft"
      || validatedRace.status === "uploading"
      || validatedRace.status === "publish_failed"
    ) {
      return { ok: false, reason: "submission_conflict", submissionId };
    }
    return committedStudioSubmissionSuccessIfEvidenceMatches(supabase, {
      input,
      ownerId,
      resumed: true,
      status: validatedRace.status,
      submissionId,
    });
  }

  const storage = supabase.storage.from(showcaseStudioBucket);
  const originalLabelUpload = await runDatabaseOperation(() => storage.upload(
    originalLabelPath,
    input.originalLabelPhoto,
    { contentType: input.originalLabelPhoto.type, upsert: false },
  ));
  if (originalLabelUpload.error) {
    return rollbackStudioDraftOrReturnCommitted(supabase, {
      ownerId,
      primaryFailure: "original_label_storage_failed",
      storagePaths,
      submissionId,
    });
  }

  const jewelryPhotoUpload = await runDatabaseOperation(() => storage.upload(
    jewelryPhotoPath,
    input.jewelryFrontPhoto,
    { contentType: input.jewelryFrontPhoto.type, upsert: false },
  ));
  if (jewelryPhotoUpload.error) {
    return rollbackStudioDraftOrReturnCommitted(supabase, {
      ownerId,
      primaryFailure: "jewelry_storage_failed",
      storagePaths,
      submissionId,
    });
  }

  const assetResult = await runDatabaseOperation(() => supabase
    .from("sparkle_finder_nic_nac_intake_assets")
    .insert([
    {
      submission_id: submissionId,
      user_id: ownerId,
      asset_kind: "original_label",
      storage_bucket: showcaseStudioBucket,
      storage_path: originalLabelPath,
      content_type: input.originalLabelPhoto.type,
      byte_size: input.originalLabelPhoto.size,
    },
    {
      submission_id: submissionId,
      user_id: ownerId,
      asset_kind: "jewelry_front",
      storage_bucket: showcaseStudioBucket,
      storage_path: jewelryPhotoPath,
      content_type: input.jewelryFrontPhoto.type,
      byte_size: input.jewelryFrontPhoto.size,
    },
    ])
    .select("id,submission_id,user_id,asset_kind"));
  if (assetResult.error) {
    return rollbackStudioDraftOrReturnCommitted(supabase, {
      ownerId,
      primaryFailure: "asset_metadata_failed",
      storagePaths,
      submissionId,
    });
  }

  const finalized = await runCompareAndSetOperation(() => compareAndSetShowcaseStudioSubmission(supabase, {
    expectedStatus: "uploading",
    ownerId,
    submissionId,
    values: { status: "submitted", submitted_at: submittedAt },
  }));
  if (finalized.error || !finalized.row) {
    return rollbackStudioDraftOrReturnCommitted(supabase, {
      ownerId,
      primaryFailure: "finalize_failed",
      storagePaths,
      submissionId,
    });
  }

  return studioSubmissionSuccess(supabase, ownerId, submissionId, "submitted", draft.resumed);
}

type StudioDraftResult =
  | {
      ok: true;
      resumed: boolean;
      status: ShowcaseStudioPersistedIntakeStatus;
    }
  | {
      ok: false;
      reason: "database_create_failed" | "database_read_failed" | "submission_conflict";
    };

async function createOrResumeStudioDraft(
  client: ShowcaseStudioPersistenceClient,
  input: {
    customerNote: string;
    itemNumber: string;
    mainStone: string;
    material: string;
    rarityClassification: "standard" | "diamond" | "unicorn";
    ownerId: string;
    submissionId: string;
  },
): Promise<StudioDraftResult> {
  const existing = await runOwnerSubmissionRead(client, input.ownerId, input.submissionId);
  if (existing.error) return { ok: false, reason: "database_read_failed" };
  if (existing.row) return validateResumableStudioRow(existing.row, input, true);

  const inserted = await runDatabaseOperation(() => client
    .from("sparkle_finder_nic_nac_intake_submissions")
    .insert({
      id: input.submissionId,
      user_id: input.ownerId,
      status: "draft",
      item_number: input.itemNumber,
      customer_note: input.customerNote,
      main_stone: input.mainStone,
      material: input.material,
      bp_label: input.rarityClassification,
    })
    .select("*")
    .maybeSingle());

  if (!inserted.error) {
    const insertedRow = asPersistenceRow(inserted.data);
    return insertedRow
      ? validateResumableStudioRow(insertedRow, input, false)
      : { ok: false, reason: "database_create_failed" };
  }

  // A concurrent request may have created the same stable owner/submission row.
  const raced = await runOwnerSubmissionRead(client, input.ownerId, input.submissionId);
  if (raced.error || !raced.row) return { ok: false, reason: "database_create_failed" };
  return validateResumableStudioRow(raced.row, input, true);
}

function validateResumableStudioRow(
  row: ShowcaseStudioPersistenceRow,
  input: {
    customerNote: string;
    itemNumber: string;
    mainStone: string;
    material: string;
    rarityClassification: "standard" | "diamond" | "unicorn";
    ownerId: string;
    submissionId: string;
  },
  resumed: boolean,
): StudioDraftResult {
  const status = readPersistedSubmissionStatus(row.status);
  if (
    readPersistenceString(row.id) !== input.submissionId
    || readPersistenceString(row.user_id) !== input.ownerId
    || !status
    || readPersistenceString(row.item_number) !== input.itemNumber
    || readPersistenceString(row.main_stone) !== input.mainStone
    || readPersistenceString(row.material) !== input.material
    || readPersistenceString(row.bp_label) !== input.rarityClassification
    || readPersistenceString(row.customer_note) !== input.customerNote
  ) {
    return { ok: false, reason: "submission_conflict" };
  }
  return { ok: true, resumed, status };
}

async function rollbackStudioDraftOrReturnCommitted(
  client: ShowcaseStudioPersistenceClient,
  input: {
    ownerId: string;
    primaryFailure: Exclude<ShowcaseStudioSubmissionFailureReason, "cleanup_failed">;
    storagePaths: string[];
    submissionId: string;
  },
): Promise<ShowcaseStudioSubmissionResult> {
  const current = await runOwnerSubmissionRead(client, input.ownerId, input.submissionId);
  if (current.error) {
    return {
      ok: false,
      reason: "cleanup_failed",
      stageFailure: input.primaryFailure,
      submissionId: input.submissionId,
    };
  }
  const currentStatus = current.row ? readPersistedSubmissionStatus(current.row.status) : null;
  if (currentStatus && currentStatus !== "uploading") {
    if (currentStatus === "draft") {
      return { ok: false, reason: "submission_conflict", submissionId: input.submissionId };
    }
    return studioSubmissionSuccess(client, input.ownerId, input.submissionId, currentStatus, true);
  }

  if (currentStatus !== "uploading") {
    return { ok: false, reason: "submission_conflict", submissionId: input.submissionId };
  }

  const assetDelete = await runDatabaseOperation(() => client
    .from("sparkle_finder_nic_nac_intake_assets")
    .delete()
    .eq("submission_id", input.submissionId)
    .eq("user_id", input.ownerId));
  const objectDelete = await runDatabaseOperation(() => client.storage
    .from(showcaseStudioBucket)
    .remove(input.storagePaths));
  const submissionDelete = await runDatabaseOperation(() => client
    .from("sparkle_finder_nic_nac_intake_submissions")
    .delete()
    .eq("id", input.submissionId)
    .eq("user_id", input.ownerId)
    .eq("status", "uploading"));

  if (assetDelete.error || objectDelete.error || submissionDelete.error) {
    return {
      ok: false,
      reason: "cleanup_failed",
      stageFailure: input.primaryFailure,
      submissionId: input.submissionId,
    };
  }
  return { ok: false, reason: input.primaryFailure, submissionId: input.submissionId };
}

async function committedStudioSubmissionSuccessIfEvidenceMatches(
  client: ShowcaseStudioPersistenceClient,
  input: {
    input: ShowcaseStudioSubmissionInput;
    ownerId: string;
    resumed: boolean;
    status: Exclude<ShowcaseStudioPersistedIntakeStatus, "draft" | "uploading">;
    submissionId: string;
  },
): Promise<ShowcaseStudioSubmissionResult> {
  const assets = await runDatabaseOperation(() => client
    .from("sparkle_finder_nic_nac_intake_assets")
    .select("submission_id,user_id,asset_kind,storage_bucket,storage_path,content_type,byte_size")
    .eq("submission_id", input.submissionId)
    .eq("user_id", input.ownerId));
  if (assets.error || !Array.isArray(assets.data) || assets.data.length !== 2) {
    return { ok: false, reason: "submission_conflict", submissionId: input.submissionId };
  }

  const rows = assets.data.flatMap((value) => {
    const row = asPersistenceRow(value);
    return row ? [row] : [];
  });
  const evidenceMatches = await Promise.all([
    committedStudioAssetMatches(client, rows, input.ownerId, input.submissionId, "original_label", input.input.originalLabelPhoto),
    committedStudioAssetMatches(client, rows, input.ownerId, input.submissionId, "jewelry_front", input.input.jewelryFrontPhoto),
  ]);
  if (!evidenceMatches.every(Boolean)) {
    return { ok: false, reason: "submission_conflict", submissionId: input.submissionId };
  }
  return studioSubmissionSuccess(
    client,
    input.ownerId,
    input.submissionId,
    input.status,
    input.resumed,
  );
}

async function committedStudioAssetMatches(
  client: ShowcaseStudioPersistenceClient,
  rows: ShowcaseStudioPersistenceRow[],
  ownerId: string,
  submissionId: string,
  role: "original_label" | "jewelry_front",
  file: File,
): Promise<boolean> {
  const matchingRows = rows.filter((row) => readPersistenceString(row.asset_kind) === role);
  if (matchingRows.length !== 1) return false;
  const row = matchingRows[0];
  const expectedPath = buildShowcaseStudioAssetPath(ownerId, submissionId, role, file.type);
  if (
    readPersistenceString(row.submission_id) !== submissionId
    || readPersistenceString(row.user_id) !== ownerId
    || readPersistenceString(row.storage_bucket) !== showcaseStudioBucket
    || readPersistenceString(row.storage_path) !== expectedPath
    || readPersistenceString(row.content_type) !== file.type
    || row.byte_size !== file.size
  ) {
    return false;
  }
  const downloaded = await runDatabaseOperation(() => client.storage.from(showcaseStudioBucket).download(expectedPath));
  return !downloaded.error
    && downloaded.data instanceof Blob
    && await studioBlobBytesEqual(downloaded.data, file);
}

async function studioBlobBytesEqual(left: Blob, right: Blob): Promise<boolean> {
  if (left.size !== right.size) return false;
  try {
    const [leftBuffer, rightBuffer] = await Promise.all([left.arrayBuffer(), right.arrayBuffer()]);
    const leftBytes = new Uint8Array(leftBuffer);
    const rightBytes = new Uint8Array(rightBuffer);
    for (let index = 0; index < leftBytes.length; index += 1) {
      if (leftBytes[index] !== rightBytes[index]) return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function studioSubmissionSuccess(
  client: ShowcaseStudioPersistenceClient,
  ownerId: string,
  submissionId: string,
  status: Exclude<ShowcaseStudioPersistedIntakeStatus, "draft" | "uploading">,
  resumed: boolean,
): Promise<ShowcaseStudioSubmissionResult> {
  const photoEvidence = await readShowcaseStudioPhotoEvidenceForOwner(client, ownerId, submissionId);
  if (photoEvidence.error || !photoEvidence.evidence) {
    return { ok: false, reason: "asset_metadata_failed", submissionId };
  }
  return {
    evidenceCommitted: true,
    ok: true,
    photoEvidence: photoEvidence.evidence,
    resumed,
    status,
    submissionId,
  };
}

async function runOwnerSubmissionRead(
  client: ShowcaseStudioPersistenceClient,
  ownerId: string,
  submissionId: string,
): Promise<{ row: ShowcaseStudioPersistenceRow | null; error: unknown }> {
  try {
    return await readShowcaseStudioSubmissionRow(client, ownerId, submissionId);
  } catch (error) {
    return { row: null, error };
  }
}

async function runCompareAndSetOperation(
  operation: () => PromiseLike<{ row: ShowcaseStudioPersistenceRow | null; error: unknown }>,
): Promise<{ row: ShowcaseStudioPersistenceRow | null; error: unknown }> {
  try {
    return await operation();
  } catch (error) {
    return { row: null, error };
  }
}

async function runDatabaseOperation(
  operation: () => PromiseLike<ShowcaseStudioDatabaseResult>,
): Promise<ShowcaseStudioDatabaseResult> {
  try {
    return await operation();
  } catch (error) {
    return { data: null, error };
  }
}

function asPersistenceRow(value: unknown): ShowcaseStudioPersistenceRow | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as ShowcaseStudioPersistenceRow
    : null;
}

export async function readShowcaseStudioIntakeStatusForUser(
  supabase: SupabaseShowcaseStudioReadClient,
  userId: string,
): Promise<ShowcaseStudioIntakeStatusReadResult> {
  const trimmedUserId = userId.trim();

  if (!trimmedUserId) {
    return createUnavailableStudioStatus();
  }

  try {
    const submissionsResult = await supabase
      .from("sparkle_finder_nic_nac_intake_submissions")
      .select(studioSubmissionColumns)
      .eq("user_id", trimmedUserId);

    if (submissionsResult.error || !Array.isArray(submissionsResult.data)) {
      return createUnavailableStudioStatus();
    }

    const latestSubmissionRow = pickLatestSubmission(
      submissionsResult.data.flatMap((row) => {
        const record = asRecord(row);

        return record && readString(record.user_id) === trimmedUserId ? [record] : [];
      }),
    );

    if (!latestSubmissionRow) {
      return createConnectedStudioStatus(null, []);
    }

    const assetsResult = await supabase
      .from("sparkle_finder_nic_nac_intake_assets")
      .select(studioAssetColumns)
      .eq("user_id", trimmedUserId);

    if (assetsResult.error || !Array.isArray(assetsResult.data)) {
      return createUnavailableStudioStatus();
    }

    const latestSubmissionId = readString(latestSubmissionRow.id);
    const assetRows = assetsResult.data.flatMap((row) => {
      const record = asRecord(row);

      return record &&
        readString(record.user_id) === trimmedUserId &&
        readString(record.submission_id) === latestSubmissionId
        ? [record]
        : [];
    });

    return createConnectedStudioStatus(latestSubmissionRow, assetRows);
  } catch {
    return createUnavailableStudioStatus();
  }
}

async function validateStudioImage(
  file: File,
  missingReason: "jewelry_photo_required" | "original_label_required",
): Promise<{ ok: true } | { ok: false; reason: ShowcaseStudioSubmissionFailureReason }> {
  if (!file || file.size <= 0) {
    return { ok: false, reason: missingReason };
  }

  if (!isShowcaseStudioImageType(file.type)) {
    return { ok: false, reason: "invalid_file_type" };
  }

  if (file.size > showcaseStudioMaxImageBytes) {
    return { ok: false, reason: "file_too_large" };
  }

  const dimensions = await readShowcaseStudioImageDimensions(file);
  if (!areSaneShowcaseStudioImageDimensions(dimensions)) {
    return { ok: false, reason: "invalid_image_dimensions" };
  }

  return { ok: true };
}

function createConnectedStudioStatus(
  latestSubmissionRow: Record<string, unknown> | null,
  assetRows: Array<Record<string, unknown>>,
): ShowcaseStudioIntakeStatusReadResult {
  const requiredUploadRoles = buildUploadRoleStatuses(assetRows);
  const missingUploadRoles = requiredUploadRoles.flatMap((roleStatus) =>
    roleStatus.present ? [] : [roleStatus.role],
  );
  const latestSubmission = latestSubmissionRow ? mapLatestSubmission(latestSubmissionRow) : null;
  const nextAction = shouldOpenStudioUploadFlow(latestSubmission, missingUploadRoles)
    ? "open_studio_upload_flow"
    : "report_existing_status";

  return {
    status: "connected",
    dataSource: "persisted",
    hasSubmittedIntake: Boolean(latestSubmission && !["draft", "uploading"].includes(latestSubmission.status)),
    requiredUploadRoles,
    missingUploadRoles,
    studioUploadHref,
    canContinueFromChat: false,
    nextAction,
    latestSubmission,
    guidance: buildStudioStatusGuidance(latestSubmission, missingUploadRoles, nextAction),
  };
}

function createUnavailableStudioStatus(): ShowcaseStudioIntakeStatusReadResult {
  return {
    status: "unavailable",
    dataSource: "persisted",
    hasSubmittedIntake: false,
    requiredUploadRoles: buildUploadRoleStatuses([]),
    missingUploadRoles: ["original_label", "jewelry_front"],
    studioUploadHref,
    canContinueFromChat: false,
    nextAction: "open_studio_upload_flow",
    latestSubmission: null,
    guidance: "Studio intake state could not be read right now. Offer to retry before claiming upload or review status.",
  };
}

function buildUploadRoleStatuses(assetRows: Array<Record<string, unknown>>): ShowcaseStudioUploadRoleStatus[] {
  return requiredUploadRoleDefinitions.map((definition) => {
    const assetRow = assetRows.find((row) => normalizeUploadRole(row.asset_kind) === definition.role);

    return {
      role: definition.role,
      label: definition.label,
      present: Boolean(assetRow),
      qualityStatus: assetRow ? normalizeQualityStatus(assetRow.nic_nac_quality_status) : null,
      feedback: assetRow ? readStringArray(assetRow.nic_nac_quality_feedback) : [],
    };
  });
}

function pickLatestSubmission(rows: Array<Record<string, unknown>>): Record<string, unknown> | null {
  return [...rows].sort((left, right) => compareSubmissionRecency(right, left))[0] ?? null;
}

function compareSubmissionRecency(left: Record<string, unknown>, right: Record<string, unknown>): number {
  return readComparableTime(left) - readComparableTime(right);
}

function readComparableTime(row: Record<string, unknown>): number {
  return Date.parse(
    readString(row.submitted_at) ||
      readString(row.updated_at) ||
      readString(row.created_at),
  ) || 0;
}

function mapLatestSubmission(row: Record<string, unknown>): ShowcaseStudioLatestSubmissionStatus {
  const suiteCatalogDesignId = readNullableString(row.suite_catalog_design_id, 200);
  const variantCandidates = mapPersistedVariantCandidates(row.extracted_catalog);
  const resolvedDesign = mapPersistedResolvedDesign(row.extracted_catalog, suiteCatalogDesignId);
  const selectedDesign = suiteCatalogDesignId
    ? resolvedDesign
      ?? variantCandidates.find((candidate) => candidate.designId === suiteCatalogDesignId)
      ?? mapSelectedDesignFromSubmissionRow(row, suiteCatalogDesignId)
    : null;
  const status = normalizeSubmissionStatus(row.status);
  return {
    status,
    submissionId: readString(row.id),
    suiteCatalogDesignId,
    variantCandidates,
    selectedDesign,
    failureCategory: customerSafeFailureCategory(status),
    itemNumber: readNullableString(row.item_number),
    designName: readNullableString(row.design_name),
    jewelryType: readNullableString(row.jewelry_type),
    collectionName: readNullableString(row.collection_name),
    collectionYear: readNullableNumber(row.collection_year),
    mainStone: readNullableString(row.main_stone),
    material: readNullableString(row.material),
    bpLabel: readNullableString(row.bp_label),
    customerNoteSnippet: readNullableString(row.customer_note, 180),
    photoFeedback: readStringArray(row.photo_feedback),
    submittedAt: readNullableString(row.submitted_at),
    acceptedAt: readNullableString(row.accepted_at),
    publishedAt: readNullableString(row.published_at),
    updatedAt: readNullableString(row.updated_at),
  };
}

function mapPersistedVariantCandidates(value: unknown): ShowcaseStudioPersistedVariantCandidate[] {
  const extracted = asRecord(value);
  if (!extracted || !Array.isArray(extracted.variantCandidates)) return [];
  const candidates: ShowcaseStudioPersistedVariantCandidate[] = [];
  const seenIds = new Set<string>();
  for (const valueCandidate of extracted.variantCandidates) {
    const candidate = mapPersistedVariantCandidate(valueCandidate);
    if (!candidate || seenIds.has(candidate.designId)) return [];
    seenIds.add(candidate.designId);
    candidates.push(candidate);
  }
  return candidates;
}

function mapPersistedResolvedDesign(
  value: unknown,
  suiteCatalogDesignId: string | null,
): ShowcaseStudioPersistedVariantCandidate | null {
  if (!suiteCatalogDesignId) return null;
  const extracted = asRecord(value);
  const resolvedDesign = extracted ? mapPersistedVariantCandidate(extracted.resolvedDesign) : null;
  return resolvedDesign?.designId === suiteCatalogDesignId ? resolvedDesign : null;
}

function mapPersistedVariantCandidate(value: unknown): ShowcaseStudioPersistedVariantCandidate | null {
  const candidate = asRecord(value);
  if (!candidate) return null;
  const designId = readString(candidate.designId).slice(0, 200);
  const itemNumber = readString(candidate.itemNumber).slice(0, 80);
  const designName = readString(candidate.designName).slice(0, 160);
  const jewelryType = readString(candidate.jewelryType).slice(0, 40);
  if (!designId || !itemNumber || !designName || !jewelryType) return null;
  return {
    designId,
    itemNumber,
    designName,
    jewelryType,
    collectionName: readNullableString(candidate.collectionName),
    collectionYear: readNullableNumber(candidate.collectionYear),
    mainStone: readNullableString(candidate.mainStone),
    material: readNullableString(candidate.material),
    canonicalPhotoUrl: readSafeHttpsUrl(candidate.canonicalPhotoUrl),
    description: readNullableString(candidate.description, 500),
  };
}

function mapSelectedDesignFromSubmissionRow(
  row: Record<string, unknown>,
  designId: string,
): ShowcaseStudioPersistedVariantCandidate | null {
  const itemNumber = readString(row.item_number).slice(0, 80);
  const designName = readString(row.design_name).slice(0, 160);
  const jewelryType = readString(row.jewelry_type).slice(0, 40);
  if (!itemNumber || !designName || !jewelryType) return null;
  return {
    designId,
    itemNumber,
    designName,
    jewelryType,
    collectionName: readNullableString(row.collection_name),
    collectionYear: readNullableNumber(row.collection_year),
    mainStone: readNullableString(row.main_stone),
    material: readNullableString(row.material),
    canonicalPhotoUrl: null,
    description: null,
  };
}

function customerSafeFailureCategory(
  status: ShowcaseStudioPersistedIntakeStatus,
): ShowcaseStudioCustomerSafeFailureCategory {
  if (status === "uploading" || status === "saved_pending_sync") return "temporary_sync";
  if (status === "photo_rejected") return "photo_quality";
  if (status === "needs_label" || status === "needs_jewelry_photo") return "missing_evidence";
  if (status === "rejected") return "invalid_details";
  if (status === "publish_failed") return "publish";
  return null;
}

function readSafeHttpsUrl(value: unknown): string | null {
  const text = readString(value).slice(0, 500);
  if (!text) return null;
  try {
    const url = new URL(text);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function shouldOpenStudioUploadFlow(
  latestSubmission: ShowcaseStudioLatestSubmissionStatus | null,
  missingUploadRoles: ShowcaseStudioUploadRole[],
): boolean {
  return !latestSubmission ||
    missingUploadRoles.length > 0 ||
    latestSubmission.status === "draft" ||
    latestSubmission.status === "uploading" ||
    latestSubmission.status === "needs_label" ||
    latestSubmission.status === "needs_jewelry_photo" ||
    latestSubmission.status === "photo_rejected" ||
    latestSubmission.status === "publish_failed";
}

function buildStudioStatusGuidance(
  latestSubmission: ShowcaseStudioLatestSubmissionStatus | null,
  missingUploadRoles: ShowcaseStudioUploadRole[],
  nextAction: ShowcaseStudioIntakeStatusReadResult["nextAction"],
): string {
  if (nextAction === "report_existing_status") {
    return "Use app-owned Studio state only. Report this existing Studio intake status; do not claim a new upload or submission from chat.";
  }

  const missingRoles = missingUploadRoles.join(", ");

  if (!latestSubmission) {
    return `No app-owned Studio intake is saved yet. Nic-Nac cannot receive uploads from chat in this UI. Send the customer to the Studio upload flow for: ${missingRoles}.`;
  }

  if (!missingRoles) {
    return "A Studio intake exists, but the current review status needs a Studio upload-flow follow-up. Do not accept replacement files from chat.";
  }

  return `A Studio intake exists, but Nic-Nac cannot receive missing files from chat in this UI. Send the customer to the Studio upload flow for: ${missingRoles}.`;
}

function normalizeUploadRole(value: unknown): ShowcaseStudioUploadRole | null {
  return value === "original_label" || value === "jewelry_front" ? value : null;
}

function normalizeQualityStatus(value: unknown): ShowcaseStudioUploadRoleStatus["qualityStatus"] {
  return value === "accepted" || value === "rejected" || value === "pending" ? value : "pending";
}

function normalizeSubmissionStatus(value: unknown): ShowcaseStudioPersistedIntakeStatus {
  if (
    value === "draft" ||
    value === "uploading" ||
    value === "submitted" ||
    value === "needs_label" ||
    value === "needs_confirmation" ||
    value === "needs_jewelry_photo" ||
    value === "photo_rejected" ||
    value === "saved_pending_sync" ||
    value === "accepted" ||
    value === "publish_queued" ||
    value === "published" ||
    value === "rejected" ||
    value === "publish_failed"
  ) {
    return value;
  }

  return "draft";
}

function readPersistedSubmissionStatus(value: unknown): ShowcaseStudioPersistedIntakeStatus | null {
  if (
    value === "draft"
    || value === "uploading"
    || value === "submitted"
    || value === "needs_label"
    || value === "needs_confirmation"
    || value === "needs_jewelry_photo"
    || value === "photo_rejected"
    || value === "saved_pending_sync"
    || value === "accepted"
    || value === "publish_queued"
    || value === "published"
    || value === "rejected"
    || value === "publish_failed"
  ) {
    return value;
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readNullableString(value: unknown, maxLength = 120): string | null {
  const cleaned = readString(value).slice(0, maxLength);

  return cleaned || null;
}

function readNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const number = typeof value === "number" ? value : Number(value);

  return Number.isFinite(number) ? number : null;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.flatMap((item) => {
        const text = readString(item).slice(0, 180);

        return text ? [text] : [];
      })
    : [];
}

function canSaveSilverState(
  accountState: CurrentSparkleFinderAccountState,
): accountState is CurrentSparkleFinderAccountState & { status: "authenticated" } {
  return accountState.status === "authenticated" && accountState.membership?.hasSilverAccess === true;
}

function cleanText(value: string | undefined, maxLength: number): string {
  return String(value ?? "")
    .trim()
    .slice(0, maxLength);
}
