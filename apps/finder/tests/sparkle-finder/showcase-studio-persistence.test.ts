import { describe, expect, it } from "vitest";
import {
  persistShowcaseStudioSubmissionForAccount,
  readShowcaseStudioIntakeStatusForUser,
  type ShowcaseStudioSubmissionInput,
} from "../../lib/sparkle-finder/showcase-studio-state";
import {
  buildShowcaseStudioAssetPath,
  persistShowcaseStudioBridgeOutcomeForOwner,
  readShowcaseStudioImageDimensions,
  reconstructShowcaseStudioRetryForOwner,
  type ShowcaseStudioDatabaseResult,
  type ShowcaseStudioPersistenceClient,
  type ShowcaseStudioQuery,
  type ShowcaseStudioTable,
} from "../../lib/sparkle-finder/showcase-studio-persistence";
import type { CurrentSparkleFinderAccountState } from "../../lib/sparkle-finder/account-service";
import type { SparkleFinderAccessState } from "../../lib/sparkle-finder/account-types";

const submissionId = "11111111-1111-4111-8111-111111111111";
const labelAssetId = "22222222-2222-4222-8222-222222222222";
const jewelryAssetId = "33333333-3333-4333-8333-333333333333";

describe("Showcase Studio staged persistence", () => {
  it("creates a draft, stores deterministic evidence, then finalizes with exact asset UUIDs", async () => {
    const client = new FakeStudioClient();
    const result = await persistShowcaseStudioSubmissionForAccount(
      client,
      currentAccountState("silver_trial"),
      studioInput({ itemNumber: "RBP5902" }),
      { now: () => new Date("2026-08-25T14:30:00.000Z") },
    );

    expect(result).toEqual({
      evidenceCommitted: true,
      ok: true,
      photoEvidence: [
        { claimedKind: "label", finderAssetId: labelAssetId, finderSubmissionId: submissionId },
        { claimedKind: "jewelry", finderAssetId: jewelryAssetId, finderSubmissionId: submissionId },
      ],
      resumed: false,
      status: "submitted",
      submissionId,
    });
    expect(client.submissions.get(submissionId)).toMatchObject({
      status: "submitted",
      item_number: "RBP5902",
      main_stone: "Ruby",
      material: "Rose gold",
      submitted_at: "2026-08-25T14:30:00.000Z",
    });
    expect([...client.objects.keys()]).toEqual([
      "user-123/studio/11111111-1111-4111-8111-111111111111/original-label/original-label.png",
      "user-123/studio/11111111-1111-4111-8111-111111111111/jewelry-front/jewelry-front.webp",
    ]);
    expect(client.operations.map((operation) => operation.stage)).toEqual(expect.arrayContaining([
      "insert:submissions", "update:submissions:claim", "upload:original-label", "upload:jewelry-front",
      "insert:assets", "update:submissions:finalize",
    ]));
  });

  it("resumes the same owner/submission without duplicating committed evidence", async () => {
    const client = new FakeStudioClient();
    await persistShowcaseStudioSubmissionForAccount(client, currentAccountState("silver_paid"), studioInput());
    const operationCount = client.operations.length;
    const result = await persistShowcaseStudioSubmissionForAccount(client, currentAccountState("silver_paid"), studioInput());

    expect(result).toMatchObject({ ok: true, resumed: true, status: "submitted", submissionId });
    expect(client.operations.slice(operationCount).some((operation) => operation.stage.startsWith("upload:"))).toBe(false);
    expect(client.submissions).toHaveLength(1);
    expect(client.assets).toHaveLength(2);
  });

  it.each([
    ["item number", { itemNumber: "RBP5903" }],
    ["customer note", { customerNote: "A different reveal note." }],
    ["main stone", { mainStone: "Rose Quartz" }],
    ["material", { material: "Silver tone" }],
  ] as const)("rejects a committed resume with different immutable %s", async (_label, overrides) => {
    const client = new FakeStudioClient();
    await persistShowcaseStudioSubmissionForAccount(client, currentAccountState("silver_paid"), studioInput());
    const operationCount = client.operations.length;

    await expect(persistShowcaseStudioSubmissionForAccount(
      client,
      currentAccountState("silver_paid"),
      studioInput(overrides),
    )).resolves.toEqual({ ok: false, reason: "submission_conflict", submissionId });
    expect(client.operations.slice(operationCount).some((operation) => operation.stage.startsWith("upload:"))).toBe(false);
    expect(client.submissions.get(submissionId)).toMatchObject({
      customer_note: "This came from a 2024 reveal.",
      item_number: "RBP5902",
      main_stone: "Ruby",
      material: "Rose gold",
    });
  });

  it("rejects different committed bytes even when MIME and byte size match", async () => {
    const client = new FakeStudioClient();
    await persistShowcaseStudioSubmissionForAccount(client, currentAccountState("silver_paid"), studioInput());
    const operationCount = client.operations.length;
    const changedLabel = new File([validPng(1200, 801)], "label.png", { type: "image/png" });

    await expect(persistShowcaseStudioSubmissionForAccount(
      client,
      currentAccountState("silver_paid"),
      studioInput({ originalLabelPhoto: changedLabel }),
    )).resolves.toEqual({ ok: false, reason: "submission_conflict", submissionId });
    expect(client.operations.slice(operationCount).some((operation) => operation.stage.startsWith("upload:"))).toBe(false);
    const storedLabel = client.objects.get(buildShowcaseStudioAssetPath(
      "user-123", submissionId, "original_label", "image/png",
    ));
    await expect(readShowcaseStudioImageDimensions(storedLabel!)).resolves.toEqual({ width: 1200, height: 800 });
  });

  it("allows only one concurrent uploader and never overwrites different bytes", async () => {
    const client = new FakeStudioClient();
    const inputs = [
      studioInput(),
      studioInput({
        originalLabelPhoto: new File([validPng(1200, 801)], "different-label.png", { type: "image/png" }),
      }),
    ];
    const results = await Promise.all(inputs.map((input) => persistShowcaseStudioSubmissionForAccount(
      client,
      currentAccountState("silver_paid"),
      input,
    )));

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toEqual([
      { ok: false, reason: "submission_conflict", submissionId },
    ]);
    expect(client.operations.filter((operation) => operation.stage.startsWith("upload:"))).toHaveLength(2);
    expect(client.operations.filter((operation) => operation.stage === "insert:assets")).toHaveLength(1);
    expect(client.assets).toHaveLength(2);
    expect(client.objects).toHaveLength(2);
    const winnerIndex = results.findIndex((result) => result.ok);
    const storedLabel = client.objects.get(buildShowcaseStudioAssetPath(
      "user-123", submissionId, "original_label", "image/png",
    ));
    await expect(readShowcaseStudioImageDimensions(storedLabel!)).resolves.toEqual({
      width: 1200,
      height: winnerIndex === 0 ? 800 : 801,
    });
  });

  it("rejects concurrent immutable fact changes without cleaning the winner", async () => {
    const client = new FakeStudioClient();
    const results = await Promise.all([
      persistShowcaseStudioSubmissionForAccount(client, currentAccountState("silver_paid"), studioInput()),
      persistShowcaseStudioSubmissionForAccount(client, currentAccountState("silver_paid"), studioInput({
        customerNote: "Conflicting note",
      })),
    ]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toHaveLength(1);
    expect(client.submissions.get(submissionId)?.status).toBe("submitted");
    expect(client.assets).toHaveLength(2);
    expect(client.objects).toHaveLength(2);
  });

  it("validates UUID, MIME, prepared size, and decoded dimensions", async () => {
    const cases: Array<[Partial<ShowcaseStudioSubmissionInput>, string]> = [
      [{ submissionId: "submission/../123" }, "invalid_submission_id"],
      [{ originalLabelPhoto: new File([validPng()], "label.svg", { type: "image/svg+xml" }) }, "invalid_file_type"],
      [{ originalLabelPhoto: new File([new ArrayBuffer(1_500_001)], "label.png", { type: "image/png" }) }, "file_too_large"],
      [{ originalLabelPhoto: new File([new ArrayBuffer(12)], "label.png", { type: "image/png" }) }, "invalid_image_dimensions"],
      [{ originalLabelPhoto: new File([validPng(2049, 100)], "label.png", { type: "image/png" }) }, "invalid_image_dimensions"],
    ];
    for (const [overrides, reason] of cases) {
      const client = new FakeStudioClient();
      await expect(persistShowcaseStudioSubmissionForAccount(client, currentAccountState("silver_paid"), studioInput(overrides)))
        .resolves.toEqual({ ok: false, reason });
      expect(client.operations).toEqual([]);
    }

    await expect(readShowcaseStudioImageDimensions(new Blob([validPng(320, 240)], { type: "image/png" })))
      .resolves.toEqual({ width: 320, height: 240 });
    await expect(readShowcaseStudioImageDimensions(new Blob([validJpeg(640, 480)], { type: "image/jpeg" })))
      .resolves.toEqual({ width: 640, height: 480 });
    await expect(readShowcaseStudioImageDimensions(new Blob([validWebp(800, 600)], { type: "image/webp" })))
      .resolves.toEqual({ width: 800, height: 600 });
  });

  it("returns precise stage failures and rolls back every pre-finalization artifact", async () => {
    const stages = [
      ["insert:submissions", "database_create_failed"],
      ["upload:original-label", "original_label_storage_failed"],
      ["upload:jewelry-front", "jewelry_storage_failed"],
      ["insert:assets", "asset_metadata_failed"],
      ["update:submissions:finalize", "finalize_failed"],
    ] as const;
    for (const [stage, reason] of stages) {
      const client = new FakeStudioClient();
      client.failOnce(stage);
      const result = await persistShowcaseStudioSubmissionForAccount(client, currentAccountState("silver_paid"), studioInput());
      expect(result).toMatchObject({ ok: false, reason });
      expect(client.submissions).toHaveLength(0);
      expect(client.assets).toHaveLength(0);
      expect(client.objects).toHaveLength(0);
    }
  });

  it("leaves a read-only draft when the atomic upload claim cannot be acquired", async () => {
    const client = new FakeStudioClient();
    client.failOnce("update:submissions:claim");
    await expect(persistShowcaseStudioSubmissionForAccount(client, currentAccountState("silver_paid"), studioInput()))
      .resolves.toEqual({ ok: false, reason: "database_create_failed", submissionId });
    expect(client.submissions.get(submissionId)?.status).toBe("draft");
    expect(client.assets).toHaveLength(0);
    expect(client.objects).toHaveLength(0);
    expect(client.operations.some((operation) => operation.stage.startsWith("upload:"))).toBe(false);
  });

  it("reports cleanup failure without losing the primary stage", async () => {
    const client = new FakeStudioClient();
    client.failOnce("upload:jewelry-front");
    client.failOnce("remove:objects");
    await expect(persistShowcaseStudioSubmissionForAccount(client, currentAccountState("silver_paid"), studioInput()))
      .resolves.toEqual({
        ok: false,
        reason: "cleanup_failed",
        stageFailure: "jewelry_storage_failed",
        submissionId,
      });
  });

  it("does not resume another owner's stable submission", async () => {
    const client = new FakeStudioClient();
    client.submissions.set(submissionId, { id: submissionId, user_id: "other-owner", status: "draft", item_number: "RBP5902" });
    const result = await persistShowcaseStudioSubmissionForAccount(client, currentAccountState("silver_paid"), studioInput());
    expect(result).toMatchObject({ ok: false, reason: "database_create_failed" });
    expect(client.operations.some((operation) => operation.stage.startsWith("upload:"))).toBe(false);
    expect(client.submissions.get(submissionId)?.user_id).toBe("other-owner");
  });

  it("requires Silver before touching persistence", async () => {
    const client = new FakeStudioClient();
    await expect(persistShowcaseStudioSubmissionForAccount(client, currentAccountState("free"), studioInput()))
      .resolves.toEqual({ ok: false, reason: "silver_required" });
    expect(client.operations).toEqual([]);
  });
});

describe("Showcase Studio recovery and monotonic outcomes", () => {
  it("preserves saved evidence after bridge failure and reconstructs exact retry metadata", async () => {
    const client = new FakeStudioClient();
    await persistShowcaseStudioSubmissionForAccount(client, currentAccountState("silver_paid"), studioInput());
    const persisted = await persistShowcaseStudioBridgeOutcomeForOwner(client, {
      ownerId: "user-123",
      submissionId,
      outcome: {
        status: "saved_pending_sync",
        lastError: "temporary Suite connection failure",
        extractedCatalog: { variantCandidates: [{ designId: "design-ruby" }] },
      },
    });
    expect(persisted).toEqual({ ok: true, status: "updated", submissionStatus: "saved_pending_sync" });
    expect(client.objects).toHaveLength(2);
    expect(client.assets).toHaveLength(2);

    const retry = await reconstructShowcaseStudioRetryForOwner(client, { ownerId: "user-123", submissionId });
    expect(retry).toMatchObject({
      ok: true,
      submissionId,
      itemNumber: "RBP5902",
      mainStone: "Ruby",
      material: "Rose gold",
      photoEvidence: [
        { claimedKind: "label", finderAssetId: labelAssetId, finderSubmissionId: submissionId },
        { claimedKind: "jewelry", finderAssetId: jewelryAssetId, finderSubmissionId: submissionId },
      ],
    });
  });

  it("filters retry by owner/submission and rejects a client-forged path", async () => {
    const client = new FakeStudioClient();
    await persistShowcaseStudioSubmissionForAccount(client, currentAccountState("silver_paid"), studioInput());
    await persistShowcaseStudioBridgeOutcomeForOwner(client, {
      ownerId: "user-123", submissionId, outcome: { status: "saved_pending_sync", lastError: "temporary" },
    });
    await expect(reconstructShowcaseStudioRetryForOwner(client, { ownerId: "other-owner", submissionId }))
      .resolves.toEqual({ ok: false, reason: "owner_not_found" });
    client.assets.get(`${submissionId}:original_label`)!.storage_path = "other-owner/studio/forged/private.png";
    await expect(reconstructShowcaseStudioRetryForOwner(client, { ownerId: "user-123", submissionId }))
      .resolves.toEqual({ ok: false, reason: "asset_metadata_invalid" });
  });

  it("does not reconstruct terminal publish failures as retryable upload evidence", async () => {
    const client = studioClientWithSubmission("publish_failed");
    addCommittedAssets(client);
    await expect(reconstructShowcaseStudioRetryForOwner(client, { ownerId: "user-123", submissionId }))
      .resolves.toEqual({ ok: false, reason: "retry_not_allowed" });
  });

  it("does not reopen a terminal publish failure through the normal upload path", async () => {
    const client = studioClientWithSubmission("publish_failed");
    addCommittedAssets(client);
    await expect(persistShowcaseStudioSubmissionForAccount(
      client,
      currentAccountState("silver_paid"),
      studioInput({ customerNote: "Saved note" }),
    )).resolves.toEqual({ ok: false, reason: "submission_conflict", submissionId });
  });

  it("does not reopen publish_failed when a concurrent request wins the upload claim", async () => {
    const client = new FakeStudioClient();
    client.beforeOnce("update:submissions:claim", () => {
      const submission = client.submissions.get(submissionId);
      if (submission) submission.status = "publish_failed";
      addCommittedAssets(client);
    });

    await expect(persistShowcaseStudioSubmissionForAccount(
      client,
      currentAccountState("silver_paid"),
      studioInput(),
    )).resolves.toEqual({ ok: false, reason: "submission_conflict", submissionId });
    expect(client.operations.some((operation) => operation.stage.startsWith("upload:"))).toBe(false);
  });

  it("keeps accepted terminal and identical outcomes idempotent", async () => {
    const client = studioClientWithSubmission("needs_confirmation");
    await expect(persistShowcaseStudioBridgeOutcomeForOwner(client, {
      ownerId: "user-123", submissionId, outcome: { status: "accepted", suiteCatalogDesignId: "design-ruby" },
    })).resolves.toMatchObject({ ok: true, status: "updated" });
    await expect(persistShowcaseStudioBridgeOutcomeForOwner(client, {
      ownerId: "user-123", submissionId, outcome: { status: "accepted", suiteCatalogDesignId: "design-ruby" },
    })).resolves.toMatchObject({ ok: true, status: "unchanged" });
    for (const status of ["saved_pending_sync", "publish_failed", "publish_queued", "published"] as const) {
      await expect(persistShowcaseStudioBridgeOutcomeForOwner(client, {
        ownerId: "user-123", submissionId, outcome: { status },
      })).resolves.toEqual({ ok: false, reason: "state_conflict" });
    }
  });

  it.each(["published", "rejected"] as const)("does not regress terminal %s outcomes", async (terminalStatus) => {
    const client = studioClientWithSubmission(terminalStatus);
    await expect(persistShowcaseStudioBridgeOutcomeForOwner(client, {
      ownerId: "user-123",
      submissionId,
      outcome: { status: "saved_pending_sync", lastError: "late retry" },
    })).resolves.toEqual({ ok: false, reason: "state_conflict" });
  });

  it("allows only one conflicting exact design to win concurrent CAS", async () => {
    const client = studioClientWithSubmission("needs_confirmation");
    const results = await Promise.all([
      persistShowcaseStudioBridgeOutcomeForOwner(client, {
        ownerId: "user-123", submissionId, outcome: { status: "accepted", suiteCatalogDesignId: "design-ruby" },
      }),
      persistShowcaseStudioBridgeOutcomeForOwner(client, {
        ownerId: "user-123", submissionId, outcome: { status: "accepted", suiteCatalogDesignId: "design-rose-quartz" },
      }),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toEqual([{ ok: false, reason: "state_conflict" }]);
  });

  it("maps saved_pending_sync status without exposing raw private fields", async () => {
    const client = studioClientWithSubmission("saved_pending_sync");
    addCommittedAssets(client);
    Object.assign(client.submissions.get(submissionId)!, {
      last_error: "private provider detail",
      suite_catalog_design_id: "design-rose-quartz",
      extracted_catalog: {
        variantCandidates: [
          {
            designId: "design-ruby",
            itemNumber: "RBP5902",
            designName: "Ruby Birthday Ring",
            jewelryType: "ring",
            mainStone: "Ruby",
            material: "Rose gold",
            canonicalPhotoUrl: "https://cdn.example.test/ruby.jpg",
          },
          {
            designId: "design-rose-quartz",
            itemNumber: "RBP5902",
            designName: "Rose Quartz Birthday Ring",
            jewelryType: "ring",
            mainStone: "Rose Quartz",
            material: "Rose gold",
            canonicalPhotoUrl: "https://cdn.example.test/rose-quartz.jpg",
          },
        ],
      },
    });
    const result = await readShowcaseStudioIntakeStatusForUser(client, "user-123");
    expect(result).toMatchObject({
      status: "connected",
      latestSubmission: {
        status: "saved_pending_sync",
        submissionId,
        suiteCatalogDesignId: "design-rose-quartz",
        failureCategory: "temporary_sync",
        selectedDesign: {
          designId: "design-rose-quartz",
          itemNumber: "RBP5902",
          mainStone: "Rose Quartz",
        },
        variantCandidates: [
          { designId: "design-ruby", itemNumber: "RBP5902", mainStone: "Ruby" },
          { designId: "design-rose-quartz", itemNumber: "RBP5902", mainStone: "Rose Quartz" },
        ],
      },
      nextAction: "report_existing_status",
    });
    expect(JSON.stringify(result)).not.toContain("private provider detail");
    expect(JSON.stringify(result)).not.toContain("storage_path");
  });

  it("hydrates an accepted exact resolve from its persisted resolvedDesign", async () => {
    const client = studioClientWithSubmission("accepted");
    addCommittedAssets(client);
    Object.assign(client.submissions.get(submissionId)!, {
      suite_catalog_design_id: "design-ruby",
      extracted_catalog: {
        resolvedDesign: {
          designId: "design-ruby",
          itemNumber: "RBP5902",
          designName: "Ruby Birthday Ring",
          jewelryType: "ring",
          collectionName: "Birthday Collection",
          collectionYear: 2026,
          mainStone: "Ruby",
          material: "Rose gold",
          canonicalPhotoUrl: "https://cdn.example.test/ruby.jpg",
          description: "The exact Ruby variant.",
        },
      },
    });

    const result = await readShowcaseStudioIntakeStatusForUser(client, "user-123");
    expect(result.latestSubmission).toMatchObject({
      status: "accepted",
      suiteCatalogDesignId: "design-ruby",
      selectedDesign: {
        designId: "design-ruby",
        itemNumber: "RBP5902",
        mainStone: "Ruby",
        canonicalPhotoUrl: "https://cdn.example.test/ruby.jpg",
        description: "The exact Ruby variant.",
      },
    });
  });
});

function studioInput(overrides: Partial<ShowcaseStudioSubmissionInput> = {}): ShowcaseStudioSubmissionInput {
  return {
    customerNote: "This came from a 2024 reveal.", itemNumber: "RBP5902",
    jewelryFrontPhoto: new File([validWebp(900, 900)], "jewelry.webp", { type: "image/webp" }),
    mainStone: "Ruby", material: "Rose gold",
    originalLabelPhoto: new File([validPng(1200, 800)], "label.png", { type: "image/png" }),
    rarityClassification: "standard",
    submissionId, ...overrides,
  };
}

function currentAccountState(accessState: SparkleFinderAccessState): CurrentSparkleFinderAccountState & { status: "authenticated" } {
  const hasSilverAccess = accessState !== "free";
  const tier = hasSilverAccess ? "silver" : "free";
  return {
    status: "authenticated", tier, displayName: "Casey Collector", email: "casey@example.test",
    customer: { id: "user-123", displayName: "Casey Collector", email: "casey@example.test", state: "PA", tier },
    membership: {
      accountId: "user-123", personId: "user-123", accessState,
      silverSource: accessState === "silver_paid" ? "stripe" : accessState === "silver_trial" ? "trial" : accessState === "silver_rep_included" ? "sparkle_suite_rep" : "none",
      trialStartedAt: null, trialEndsAt: null, silverStartedAt: hasSilverAccess ? "2026-05-01T12:00:00.000Z" : null,
      silverEndsAt: null, effectiveState: accessState, hasSilverAccess, isTrialActive: accessState === "silver_trial", isTrialExpired: false,
    },
    communicationConsent: {
      accountEmailRequired: true, accountSmsAllowed: false, accountSmsConsentedAt: null,
      promotionalEmailOptIn: false, promotionalEmailConsentedAt: null, promotionalSmsOptIn: false,
      promotionalSmsConsentedAt: null, privacyAcknowledgedAt: "2026-05-01T12:00:00.000Z",
    },
  };
}

function studioClientWithSubmission(status: string): FakeStudioClient {
  const client = new FakeStudioClient();
  client.submissions.set(submissionId, {
    id: submissionId, user_id: "user-123", status, item_number: "RBP5902", customer_note: "Saved note",
    main_stone: "Ruby", material: "Rose gold", created_at: "2026-08-25T14:00:00.000Z", updated_at: "2026-08-25T14:00:00.000Z",
  });
  return client;
}

function addCommittedAssets(client: FakeStudioClient): void {
  const values = [
    ["original_label", labelAssetId, new Blob([validPng(1200, 800)], { type: "image/png" }), "image/png"],
    ["jewelry_front", jewelryAssetId, new Blob([validWebp(900, 900)], { type: "image/webp" }), "image/webp"],
  ] as const;
  for (const [role, id, blob, type] of values) {
    const path = buildShowcaseStudioAssetPath("user-123", submissionId, role, type);
    client.assets.set(`${submissionId}:${role}`, {
      id, submission_id: submissionId, user_id: "user-123", asset_kind: role,
      storage_bucket: "sparkle-finder-private", storage_path: path, content_type: type, byte_size: blob.size,
      nic_nac_quality_status: "pending", nic_nac_quality_feedback: [],
    });
    client.objects.set(path, blob);
  }
}

type FakeOperation = { stage: string; filters?: Array<[string, unknown]>; values?: unknown };

class FakeStudioClient implements ShowcaseStudioPersistenceClient {
  readonly submissions = new Map<string, Record<string, unknown>>();
  readonly assets = new Map<string, Record<string, unknown>>();
  readonly objects = new Map<string, Blob>();
  readonly operations: FakeOperation[] = [];
  private readonly failures = new Map<string, number>();
  private readonly beforeStage = new Map<string, () => void>();

  failOnce(stage: string): void { this.failures.set(stage, (this.failures.get(stage) ?? 0) + 1); }
  beforeOnce(stage: string, callback: () => void): void { this.beforeStage.set(stage, callback); }
  runBeforeStage(stage: string): void {
    const callback = this.beforeStage.get(stage);
    if (!callback) return;
    this.beforeStage.delete(stage);
    callback();
  }
  consumeFailure(stage: string): boolean {
    const remaining = this.failures.get(stage) ?? 0;
    if (remaining < 1) return false;
    this.failures.set(stage, remaining - 1);
    return true;
  }
  from(table: string): ShowcaseStudioTable {
    return {
      delete: () => new FakeQuery(this, table, "delete"),
      insert: (values) => new FakeQuery(this, table, "insert", values),
      select: (columns) => new FakeQuery(this, table, "select").select(columns),
      update: (values) => new FakeQuery(this, table, "update", values),
      upsert: (values) => new FakeQuery(this, table, "upsert", values),
    };
  }
  storage = { from: (bucket: string) => ({
    upload: async (path: string, file: File | Blob, options: { contentType: string; upsert: false }) => {
      const stage = path.includes("original-label") ? "upload:original-label" : "upload:jewelry-front";
      this.operations.push({ stage, values: { bucket, options, path } });
      if (this.consumeFailure(stage)) return { data: null, error: new Error(stage) };
      if (this.objects.has(path)) return { data: null, error: new Error("duplicate object") };
      this.objects.set(path, file); return { data: { path }, error: null };
    },
    remove: async (paths: string[]) => {
      const stage = "remove:objects"; this.operations.push({ stage, values: paths });
      if (this.consumeFailure(stage)) return { data: null, error: new Error(stage) };
      for (const path of paths) this.objects.delete(path); return { data: paths, error: null };
    },
    download: async (path: string) => {
      const data = this.objects.get(path) ?? null; this.operations.push({ stage: "download:object", values: path });
      return { data, error: data ? null : new Error("missing") };
    },
  }) };
}

class FakeQuery implements ShowcaseStudioQuery {
  private readonly filters: Array<[string, unknown]> = [];
  private selectedColumns = "";
  constructor(
    private readonly client: FakeStudioClient, private readonly table: string,
    private action: "delete" | "insert" | "select" | "update" | "upsert", private values?: unknown,
  ) {}
  delete(): ShowcaseStudioQuery { this.action = "delete"; return this; }
  eq(column: string, value: unknown): ShowcaseStudioQuery { this.filters.push([column, value]); return this; }
  maybeSingle(): PromiseLike<ShowcaseStudioDatabaseResult> {
    return this.execute().then((result) => ({ data: Array.isArray(result.data) ? result.data[0] ?? null : result.data, error: result.error }));
  }
  select(columns: string): ShowcaseStudioQuery { this.selectedColumns = columns; return this; }
  update(values: unknown): ShowcaseStudioQuery { this.action = "update"; this.values = values; return this; }
  then<TResult1 = ShowcaseStudioDatabaseResult, TResult2 = never>(
    onfulfilled?: ((value: ShowcaseStudioDatabaseResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> { return this.execute().then(onfulfilled, onrejected); }

  private async execute(): Promise<ShowcaseStudioDatabaseResult> {
    const tableKind = this.table.endsWith("_assets") ? "assets" : "submissions";
    const status = asObject(this.values).status;
    const stage = this.action === "update" && tableKind === "submissions"
      ? `update:submissions:${status === "uploading" ? "claim" : status === "submitted" ? "finalize" : "outcome"}`
      : `${this.action}:${tableKind}`;
    this.client.operations.push({ stage, filters: [...this.filters], values: this.values });
    this.client.runBeforeStage(stage);
    if (this.client.consumeFailure(stage)) return { data: null, error: new Error(stage) };
    const store = tableKind === "assets" ? this.client.assets : this.client.submissions;
    if (this.action === "select") return { data: this.filteredRows(store), error: null };
    if (this.action === "insert") return this.insertRows(store, tableKind);
    if (this.action === "upsert") return this.upsertRows(store, tableKind);
    if (this.action === "update") {
      const rows = this.filteredRows(store); for (const row of rows) Object.assign(row, asObject(this.values));
      return { data: this.selectedColumns ? rows : null, error: null };
    }
    for (const [key, row] of store) if (this.matches(row)) store.delete(key);
    return { data: null, error: null };
  }
  private insertRows(store: Map<string, Record<string, unknown>>, tableKind: string): ShowcaseStudioDatabaseResult {
    const inserted: Record<string, unknown>[] = [];
    for (const value of Array.isArray(this.values) ? this.values : [this.values]) {
      const incoming = asObject(value);
      const row: Record<string, unknown> = {
        ...incoming,
        ...(tableKind === "assets" && !incoming.id
          ? { id: incoming.asset_kind === "original_label" ? labelAssetId : jewelryAssetId }
          : {}),
      };
      const key = tableKind === "assets" ? `${row.submission_id}:${row.asset_kind}` : String(row.id);
      if (store.has(key)) return { data: null, error: new Error("duplicate") };
      store.set(key, row); inserted.push(row);
    }
    return { data: this.selectedColumns ? inserted : null, error: null };
  }
  private upsertRows(store: Map<string, Record<string, unknown>>, tableKind: string): ShowcaseStudioDatabaseResult {
    const upserted = (Array.isArray(this.values) ? this.values : [this.values]).map((value) => {
      const incoming = asObject(value);
      const key = tableKind === "assets" ? `${incoming.submission_id}:${incoming.asset_kind}` : String(incoming.id);
      const existing = store.get(key) ?? {};
      const id = existing.id ?? (incoming.asset_kind === "original_label" ? labelAssetId : jewelryAssetId);
      const row = { ...existing, ...incoming, id }; store.set(key, row); return row;
    });
    return { data: this.selectedColumns ? upserted : null, error: null };
  }
  private filteredRows(store: Map<string, Record<string, unknown>>): Record<string, unknown>[] {
    return [...store.values()].filter((row) => this.matches(row));
  }
  private matches(row: Record<string, unknown>): boolean { return this.filters.every(([column, value]) => row[column] === value); }
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function validPng(width = 100, height = 80): ArrayBuffer {
  const bytes = new Uint8Array(24); bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const view = new DataView(bytes.buffer); view.setUint32(8, 13);
  bytes.set([..."IHDR"].map((value) => value.charCodeAt(0)), 12);
  view.setUint32(16, width); view.setUint32(20, height); return bytes.buffer;
}
function validJpeg(width: number, height: number): ArrayBuffer {
  return new Uint8Array([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x07, 0x08, (height >> 8) & 0xff, height & 0xff, (width >> 8) & 0xff, width & 0xff, 0xff, 0xd9]).buffer;
}
function validWebp(width: number, height: number): ArrayBuffer {
  const bytes = new Uint8Array(30);
  bytes.set([..."RIFF"].map((value) => value.charCodeAt(0)), 0);
  bytes.set([..."WEBP"].map((value) => value.charCodeAt(0)), 8);
  bytes.set([..."VP8X"].map((value) => value.charCodeAt(0)), 12);
  writeUint24(bytes, 24, width - 1); writeUint24(bytes, 27, height - 1); return bytes.buffer;
}
function writeUint24(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = value & 0xff; bytes[offset + 1] = (value >> 8) & 0xff; bytes[offset + 2] = (value >> 16) & 0xff;
}
