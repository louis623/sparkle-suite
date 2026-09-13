export type ShowcaseStudioDatabaseResult = {
  data: unknown;
  error: unknown;
};

export type ShowcaseStudioQuery = PromiseLike<ShowcaseStudioDatabaseResult> & {
  delete: () => ShowcaseStudioQuery;
  eq: (column: string, value: unknown) => ShowcaseStudioQuery;
  maybeSingle: () => PromiseLike<ShowcaseStudioDatabaseResult>;
  select: (columns: string) => ShowcaseStudioQuery;
  update: (values: unknown) => ShowcaseStudioQuery;
};

export type ShowcaseStudioTable = {
  delete: () => ShowcaseStudioQuery;
  insert: (values: unknown) => ShowcaseStudioQuery;
  select: (columns: string) => ShowcaseStudioQuery;
  update: (values: unknown) => ShowcaseStudioQuery;
  upsert: (
    values: unknown,
    options: { ignoreDuplicates: false; onConflict: string },
  ) => ShowcaseStudioQuery;
};

export type ShowcaseStudioPersistenceClient = {
  from: (table: string) => ShowcaseStudioTable;
  storage: {
    from: (bucket: string) => {
      download: (path: string) => PromiseLike<ShowcaseStudioDatabaseResult>;
      remove: (paths: string[]) => PromiseLike<ShowcaseStudioDatabaseResult>;
      upload: (
        path: string,
        file: File | Blob,
        options: { contentType: string; upsert: false },
      ) => PromiseLike<ShowcaseStudioDatabaseResult>;
    };
  };
};

export type ShowcaseStudioPersistenceRow = Record<string, unknown>;

export type ShowcaseStudioPhotoEvidence = readonly [
  {
    claimedKind: "label";
    finderAssetId: string;
    finderSubmissionId: string;
  },
  {
    claimedKind: "jewelry";
    finderAssetId: string;
    finderSubmissionId: string;
  },
];

export type ShowcaseStudioBridgePersistedStatus =
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

export type ShowcaseStudioBridgePersistenceInput = {
  bpLabel?: string | null;
  collectionName?: string | null;
  collectionYear?: number | null;
  designName?: string | null;
  extractedCatalog?: unknown;
  jewelryType?: string | null;
  lastError?: string | null;
  mainStone?: string | null;
  material?: string | null;
  photoFeedback?: string[];
  status: ShowcaseStudioBridgePersistedStatus;
  suiteCatalogDesignId?: string | null;
  suitePublishRequestId?: string | null;
};

export type ShowcaseStudioBridgePersistenceResult =
  | {
      ok: true;
      status: "unchanged" | "updated";
      submissionStatus: ShowcaseStudioBridgePersistedStatus;
    }
  | {
      ok: false;
      reason: "database_read_failed" | "database_update_failed" | "invalid_submission_id" | "owner_not_found" | "state_conflict";
    };

export type ShowcaseStudioRetryReconstructionResult =
  | {
      ok: true;
      customerNote: string;
      itemNumber: string;
      jewelryFrontPhoto: Blob;
      mainStone: string | null;
      material: string | null;
      rarityClassification: "standard" | "diamond" | "unicorn";
      originalLabelPhoto: Blob;
      photoEvidence: ShowcaseStudioPhotoEvidence;
      submissionId: string;
    }
  | {
      ok: false;
      reason:
        | "asset_download_failed"
        | "asset_metadata_invalid"
        | "database_read_failed"
        | "invalid_submission_id"
        | "owner_not_found"
        | "retry_not_allowed";
    };

export const showcaseStudioBucket = "sparkle-finder-private";
export const showcaseStudioMaxImageBytes = 1_500_000;
export const showcaseStudioMaxImageEdge = 2_048;
export const showcaseStudioAllowedImageTypes = ["image/jpeg", "image/png", "image/webp"] as const;

const stableUuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isStableShowcaseStudioSubmissionId(value: string): boolean {
  const normalized = value.trim();
  return stableUuidPattern.test(normalized) && normalized !== "00000000-0000-0000-0000-000000000000";
}

export function normalizeShowcaseStudioSubmissionId(value: string): string {
  return value.trim().toLowerCase();
}

export function isShowcaseStudioImageType(value: string): value is typeof showcaseStudioAllowedImageTypes[number] {
  return showcaseStudioAllowedImageTypes.includes(value as typeof showcaseStudioAllowedImageTypes[number]);
}

export async function readShowcaseStudioImageDimensions(
  file: Blob,
  contentType = file.type,
): Promise<{ height: number; width: number } | null> {
  if (!isShowcaseStudioImageType(contentType) || file.size < 12 || file.size > showcaseStudioMaxImageBytes) {
    return null;
  }
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    return null;
  }

  if (contentType === "image/png") return readPngDimensions(bytes);
  if (contentType === "image/webp") return readWebpDimensions(bytes);
  return readJpegDimensions(bytes);
}

export function areSaneShowcaseStudioImageDimensions(
  value: { height: number; width: number } | null,
): value is { height: number; width: number } {
  return Boolean(
    value
    && Number.isSafeInteger(value.width)
    && Number.isSafeInteger(value.height)
    && value.width > 0
    && value.height > 0
    && value.width <= showcaseStudioMaxImageEdge
    && value.height <= showcaseStudioMaxImageEdge,
  );
}

export function buildShowcaseStudioAssetPath(
  ownerId: string,
  submissionId: string,
  role: "original_label" | "jewelry_front",
  contentType: string,
): string {
  const folder = role === "original_label" ? "original-label" : "jewelry-front";
  const fileName = role === "original_label" ? "original-label" : "jewelry-front";
  return `${safePathSegment(ownerId)}/studio/${normalizeShowcaseStudioSubmissionId(submissionId)}/${folder}/${fileName}.${imageExtension(contentType)}`;
}

export async function readShowcaseStudioSubmissionRow(
  client: ShowcaseStudioPersistenceClient,
  ownerId: string,
  submissionId: string,
): Promise<{ row: ShowcaseStudioPersistenceRow | null; error: unknown }> {
  const result = await client
    .from("sparkle_finder_nic_nac_intake_submissions")
    .select("*")
    .eq("id", submissionId)
    .eq("user_id", ownerId)
    .maybeSingle();
  const row = asRecord(result.data);
  return { row, error: result.error };
}

export async function compareAndSetShowcaseStudioSubmission(
  client: ShowcaseStudioPersistenceClient,
  input: {
    ownerId: string;
    submissionId: string;
    expectedStatus: string;
    values: Record<string, unknown>;
  },
): Promise<{ row: ShowcaseStudioPersistenceRow | null; error: unknown }> {
  const result = await client
    .from("sparkle_finder_nic_nac_intake_submissions")
    .update(input.values)
    .eq("id", input.submissionId)
    .eq("user_id", input.ownerId)
    .eq("status", input.expectedStatus)
    .select("*")
    .maybeSingle();
  const row = asRecord(result.data);
  if (
    row
    && (readString(row.id) !== input.submissionId
      || readString(row.user_id) !== input.ownerId)
  ) {
    return { row: null, error: new Error("owner_scope_mismatch") };
  }
  return { row, error: result.error };
}

export async function readShowcaseStudioPhotoEvidenceForOwner(
  client: ShowcaseStudioPersistenceClient,
  ownerId: string,
  submissionId: string,
): Promise<{ evidence: ShowcaseStudioPhotoEvidence | null; error: unknown }> {
  const result = await safeDatabaseOperation(() => client
    .from("sparkle_finder_nic_nac_intake_assets")
    .select("id,submission_id,user_id,asset_kind")
    .eq("submission_id", submissionId)
    .eq("user_id", ownerId));
  if (result.error || !Array.isArray(result.data)) return { evidence: null, error: result.error ?? new Error("invalid_asset_rows") };

  const rows = result.data.flatMap((value) => {
    const row = asRecord(value);
    return row ? [row] : [];
  });
  const label = readEvidenceRow(rows, ownerId, submissionId, "original_label");
  const jewelry = readEvidenceRow(rows, ownerId, submissionId, "jewelry_front");
  if (!label || !jewelry || rows.length !== 2 || label.finderAssetId === jewelry.finderAssetId) {
    return { evidence: null, error: new Error("invalid_asset_rows") };
  }
  return {
    evidence: [
      { ...label, claimedKind: "label" },
      { ...jewelry, claimedKind: "jewelry" },
    ],
    error: null,
  };
}

export async function persistShowcaseStudioBridgeOutcomeForOwner(
  client: ShowcaseStudioPersistenceClient,
  input: {
    now?: () => Date;
    outcome: ShowcaseStudioBridgePersistenceInput;
    ownerId: string;
    submissionId: string;
  },
): Promise<ShowcaseStudioBridgePersistenceResult> {
  if (!isStableShowcaseStudioSubmissionId(input.submissionId)) {
    return { ok: false, reason: "invalid_submission_id" };
  }
  const submissionId = normalizeShowcaseStudioSubmissionId(input.submissionId);
  const ownerId = input.ownerId.trim();
  const current = await safeReadSubmission(client, ownerId, submissionId);
  if (current.error) return { ok: false, reason: "database_read_failed" };
  if (!current.row) return { ok: false, reason: "owner_not_found" };

  const currentStatus = readString(current.row.status);
  const existingDesignId = nullableString(current.row.suite_catalog_design_id);
  const nextDesignId = cleanNullableText(input.outcome.suiteCatalogDesignId, 200);
  if (
    !canTransitionStudioStatus(currentStatus, input.outcome.status)
    || (existingDesignId && nextDesignId && existingDesignId !== nextDesignId)
  ) {
    return { ok: false, reason: "state_conflict" };
  }
  if (currentStatus === input.outcome.status) {
    return { ok: true, status: "unchanged", submissionStatus: input.outcome.status };
  }

  const now = (input.now?.() ?? new Date()).toISOString();
  const values = bridgeOutcomeValues(
    input.outcome,
    now,
    existingDesignId,
    nullableString(current.row.accepted_at),
  );
  const updated = await safeCompareAndSet(client, {
    expectedStatus: currentStatus,
    ownerId,
    submissionId,
    values,
  });
  if (updated.error) return { ok: false, reason: "database_update_failed" };
  if (updated.row && readString(updated.row.status) === input.outcome.status) {
    return { ok: true, status: "updated", submissionStatus: input.outcome.status };
  }

  // A racing retry may have written the same terminal result. Treat only an
  // identical status/design as idempotent; every conflicting result fails.
  const raced = await safeReadSubmission(client, ownerId, submissionId);
  if (raced.error) return { ok: false, reason: "database_read_failed" };
  const racedDesignId = raced.row ? nullableString(raced.row.suite_catalog_design_id) : null;
  if (
    raced.row
    && readString(raced.row.status) === input.outcome.status
    && (!nextDesignId || nextDesignId === racedDesignId)
  ) {
    return { ok: true, status: "unchanged", submissionStatus: input.outcome.status };
  }
  return { ok: false, reason: "state_conflict" };
}

export async function reconstructShowcaseStudioRetryForOwner(
  client: ShowcaseStudioPersistenceClient,
  input: { ownerId: string; submissionId: string },
): Promise<ShowcaseStudioRetryReconstructionResult> {
  if (!isStableShowcaseStudioSubmissionId(input.submissionId)) {
    return { ok: false, reason: "invalid_submission_id" };
  }
  const submissionId = normalizeShowcaseStudioSubmissionId(input.submissionId);
  const ownerId = input.ownerId.trim();
  const submission = await safeReadSubmission(client, ownerId, submissionId);
  if (submission.error) return { ok: false, reason: "database_read_failed" };
  if (!submission.row) return { ok: false, reason: "owner_not_found" };
  if (!new Set(["submitted", "saved_pending_sync"]).has(readString(submission.row.status))) {
    return { ok: false, reason: "retry_not_allowed" };
  }

  const assetsResult = await safeDatabaseOperation(() => client
    .from("sparkle_finder_nic_nac_intake_assets")
    .select("submission_id,user_id,asset_kind,storage_bucket,storage_path,content_type,byte_size")
    .eq("submission_id", submissionId)
    .eq("user_id", ownerId));
  if (assetsResult.error || !Array.isArray(assetsResult.data)) {
    return { ok: false, reason: "database_read_failed" };
  }
  const rows = assetsResult.data.flatMap((value) => {
    const row = asRecord(value);
    return row ? [row] : [];
  });
  const originalLabel = validateRetryAsset(rows, ownerId, submissionId, "original_label");
  const jewelryFront = validateRetryAsset(rows, ownerId, submissionId, "jewelry_front");
  if (!originalLabel || !jewelryFront || rows.length !== 2) {
    return { ok: false, reason: "asset_metadata_invalid" };
  }
  const photoEvidenceResult = await readShowcaseStudioPhotoEvidenceForOwner(client, ownerId, submissionId);
  if (photoEvidenceResult.error || !photoEvidenceResult.evidence) {
    return { ok: false, reason: "asset_metadata_invalid" };
  }

  const storage = client.storage.from(showcaseStudioBucket);
  const [labelDownload, jewelryDownload] = await Promise.all([
    safeDatabaseOperation(() => storage.download(originalLabel.path)),
    safeDatabaseOperation(() => storage.download(jewelryFront.path)),
  ]);
  const labelBlob = labelDownload.data instanceof Blob ? labelDownload.data : null;
  const jewelryBlob = jewelryDownload.data instanceof Blob ? jewelryDownload.data : null;
  if (labelDownload.error || jewelryDownload.error || !labelBlob || !jewelryBlob) {
    return { ok: false, reason: "asset_download_failed" };
  }
  const [labelDimensions, jewelryDimensions] = await Promise.all([
    readShowcaseStudioImageDimensions(labelBlob, originalLabel.contentType),
    readShowcaseStudioImageDimensions(jewelryBlob, jewelryFront.contentType),
  ]);
  if (
    !isValidRetryBlob(labelBlob, originalLabel.contentType, originalLabel.byteSize)
    || !isValidRetryBlob(jewelryBlob, jewelryFront.contentType, jewelryFront.byteSize)
    || !areSaneShowcaseStudioImageDimensions(labelDimensions)
    || !areSaneShowcaseStudioImageDimensions(jewelryDimensions)
  ) {
    return { ok: false, reason: "asset_metadata_invalid" };
  }

  return {
    ok: true,
    customerNote: readString(submission.row.customer_note).slice(0, 500),
    itemNumber: readString(submission.row.item_number).slice(0, 80),
    jewelryFrontPhoto: jewelryBlob,
    mainStone: nullableString(submission.row.main_stone),
    material: nullableString(submission.row.material),
    rarityClassification: normalizeRarityClassification(submission.row.bp_label),
    originalLabelPhoto: labelBlob,
    photoEvidence: photoEvidenceResult.evidence,
    submissionId,
  };
}

export function asRecord(value: unknown): ShowcaseStudioPersistenceRow | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as ShowcaseStudioPersistenceRow
    : null;
}

export function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeRarityClassification(value: unknown): "standard" | "diamond" | "unicorn" {
  return value === "diamond" || value === "unicorn" ? value : "standard";
}

const allowedStudioTransitions: Record<string, ReadonlySet<ShowcaseStudioBridgePersistedStatus>> = {
  submitted: new Set([
    "needs_label", "needs_confirmation", "needs_jewelry_photo", "photo_rejected", "saved_pending_sync",
    "accepted", "publish_queued", "published", "rejected", "publish_failed",
  ]),
  needs_label: new Set(["needs_confirmation", "needs_jewelry_photo", "photo_rejected", "saved_pending_sync", "rejected"]),
  needs_confirmation: new Set(["saved_pending_sync", "accepted", "publish_queued", "published", "rejected"]),
  needs_jewelry_photo: new Set(["photo_rejected", "saved_pending_sync", "rejected"]),
  photo_rejected: new Set(["saved_pending_sync", "rejected"]),
  saved_pending_sync: new Set([
    "needs_label", "needs_confirmation", "needs_jewelry_photo", "photo_rejected", "accepted", "publish_queued",
    "published", "rejected", "publish_failed",
  ]),
  accepted: new Set(),
  publish_queued: new Set(["saved_pending_sync", "published", "publish_failed"]),
  publish_failed: new Set(),
  published: new Set(),
  rejected: new Set(),
};

function canTransitionStudioStatus(current: string, next: ShowcaseStudioBridgePersistedStatus): boolean {
  return current === next || Boolean(allowedStudioTransitions[current]?.has(next));
}

function bridgeOutcomeValues(
  outcome: ShowcaseStudioBridgePersistenceInput,
  now: string,
  existingDesignId: string | null,
  existingAcceptedAt: string | null,
): Record<string, unknown> {
  const values: Record<string, unknown> = {
    status: outcome.status,
    last_error: cleanNullableText(outcome.lastError, 500) ?? "",
    photo_feedback: cleanStringArray(outcome.photoFeedback, 12, 180),
  };
  if (outcome.extractedCatalog !== undefined) values.extracted_catalog = outcome.extractedCatalog;
  const suiteCatalogDesignId = cleanNullableText(outcome.suiteCatalogDesignId, 200) ?? existingDesignId;
  if (suiteCatalogDesignId) values.suite_catalog_design_id = suiteCatalogDesignId;
  const suitePublishRequestId = cleanNullableText(outcome.suitePublishRequestId, 200);
  if (suitePublishRequestId) values.suite_publish_request_id = suitePublishRequestId;

  const textFields: Array<[keyof ShowcaseStudioBridgePersistenceInput, string, number]> = [
    ["bpLabel", "bp_label", 40],
    ["collectionName", "collection_name", 120],
    ["designName", "design_name", 160],
    ["jewelryType", "jewelry_type", 40],
    ["mainStone", "main_stone", 120],
    ["material", "material", 120],
  ];
  for (const [source, target, maxLength] of textFields) {
    if (outcome[source] !== undefined) values[target] = cleanNullableText(outcome[source], maxLength) ?? "";
  }
  if (
    outcome.collectionYear === null
    || (Number.isSafeInteger(outcome.collectionYear) && Number(outcome.collectionYear) >= 1900 && Number(outcome.collectionYear) <= 2200)
  ) values.collection_year = outcome.collectionYear;
  if (["accepted", "publish_queued", "published"].includes(outcome.status) && !existingAcceptedAt) {
    values.accepted_at = now;
  }
  if (outcome.status === "published") values.published_at = now;
  return values;
}

function validateRetryAsset(
  rows: ShowcaseStudioPersistenceRow[],
  ownerId: string,
  submissionId: string,
  role: "original_label" | "jewelry_front",
): { byteSize: number; contentType: string; path: string } | null {
  const matching = rows.filter((row) => readString(row.asset_kind) === role);
  if (matching.length !== 1) return null;
  const row = matching[0];
  const contentType = readString(row.content_type);
  const byteSize = Number(row.byte_size);
  const expectedPath = buildShowcaseStudioAssetPath(ownerId, submissionId, role, contentType);
  if (
    readString(row.submission_id) !== submissionId
    || readString(row.user_id) !== ownerId
    || readString(row.storage_bucket) !== showcaseStudioBucket
    || readString(row.storage_path) !== expectedPath
    || !isShowcaseStudioImageType(contentType)
    || !Number.isSafeInteger(byteSize)
    || byteSize < 1
    || byteSize > showcaseStudioMaxImageBytes
  ) {
    return null;
  }
  return { byteSize, contentType, path: expectedPath };
}

function readEvidenceRow(
  rows: ShowcaseStudioPersistenceRow[],
  ownerId: string,
  submissionId: string,
  role: "original_label" | "jewelry_front",
): { finderAssetId: string; finderSubmissionId: string } | null {
  const matches = rows.filter((row) => readString(row.asset_kind) === role);
  if (matches.length !== 1) return null;
  const row = matches[0];
  const finderAssetId = readString(row.id).toLowerCase();
  if (
    !isStableShowcaseStudioSubmissionId(finderAssetId)
    || readString(row.submission_id) !== submissionId
    || readString(row.user_id) !== ownerId
  ) return null;
  return { finderAssetId, finderSubmissionId: submissionId };
}

function isValidRetryBlob(blob: Blob, contentType: string, byteSize: number): boolean {
  return blob.type === contentType
    && blob.size === byteSize
    && blob.size > 0
    && blob.size <= showcaseStudioMaxImageBytes;
}

async function safeReadSubmission(
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

async function safeCompareAndSet(
  client: ShowcaseStudioPersistenceClient,
  input: Parameters<typeof compareAndSetShowcaseStudioSubmission>[1],
): Promise<{ row: ShowcaseStudioPersistenceRow | null; error: unknown }> {
  try {
    return await compareAndSetShowcaseStudioSubmission(client, input);
  } catch (error) {
    return { row: null, error };
  }
}

async function safeDatabaseOperation(
  operation: () => PromiseLike<ShowcaseStudioDatabaseResult>,
): Promise<ShowcaseStudioDatabaseResult> {
  try {
    return await operation();
  } catch (error) {
    return { data: null, error };
  }
}

function cleanNullableText(value: unknown, maxLength: number): string | null {
  const text = readString(value).slice(0, maxLength);
  return text || null;
}

function nullableString(value: unknown): string | null {
  return cleanNullableText(value, 500);
}

function cleanStringArray(value: unknown, maxItems: number, maxLength: number): string[] {
  return Array.isArray(value)
    ? value.slice(0, maxItems).flatMap((item) => {
        const text = cleanNullableText(item, maxLength);
        return text ? [text] : [];
      })
    : [];
}

function imageExtension(contentType: string): "jpg" | "png" | "webp" {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

function readPngDimensions(bytes: Uint8Array): { height: number; width: number } | null {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (
    bytes.length < 24
    || !signature.every((value, index) => bytes[index] === value)
    || ascii(bytes, 12, 16) !== "IHDR"
  ) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(8) !== 13) return null;
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

function readJpegDimensions(bytes: Uint8Array): { height: number; width: number } | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) return null;
    const segmentLength = (bytes[offset] << 8) | bytes[offset + 1];
    if (segmentLength < 2 || offset + segmentLength > bytes.length) return null;
    if (isJpegStartOfFrame(marker)) {
      if (segmentLength < 7) return null;
      return {
        height: (bytes[offset + 3] << 8) | bytes[offset + 4],
        width: (bytes[offset + 5] << 8) | bytes[offset + 6],
      };
    }
    offset += segmentLength;
  }
  return null;
}

function isJpegStartOfFrame(marker: number): boolean {
  return (marker >= 0xc0 && marker <= 0xc3)
    || (marker >= 0xc5 && marker <= 0xc7)
    || (marker >= 0xc9 && marker <= 0xcb)
    || (marker >= 0xcd && marker <= 0xcf);
}

function readWebpDimensions(bytes: Uint8Array): { height: number; width: number } | null {
  if (
    bytes.length < 30
    || ascii(bytes, 0, 4) !== "RIFF"
    || ascii(bytes, 8, 12) !== "WEBP"
  ) return null;
  const chunk = ascii(bytes, 12, 16);
  if (chunk === "VP8X") {
    return {
      width: 1 + readUint24LittleEndian(bytes, 24),
      height: 1 + readUint24LittleEndian(bytes, 27),
    };
  }
  if (chunk === "VP8 " && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
    return {
      width: (bytes[26] | (bytes[27] << 8)) & 0x3fff,
      height: (bytes[28] | (bytes[29] << 8)) & 0x3fff,
    };
  }
  if (chunk === "VP8L" && bytes[20] === 0x2f && bytes.length >= 25) {
    return {
      width: 1 + bytes[21] + ((bytes[22] & 0x3f) << 8),
      height: 1 + (bytes[22] >> 6) + (bytes[23] << 2) + ((bytes[24] & 0x0f) << 10),
    };
  }
  return null;
}

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.slice(start, end));
}

function readUint24LittleEndian(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function safePathSegment(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9_-]+/g, "-");
}
