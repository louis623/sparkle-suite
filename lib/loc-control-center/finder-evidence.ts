import "server-only";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapStudioReviewQueueRow } from "@/lib/sparkle-finder/studio-intake-v2";
import { LocBridgeError } from "./security";

const inputSchema = z
  .object({
    product: z.literal("finder"),
    finderSubmissionId: z.uuid(),
    finderAssetId: z.uuid(),
  })
  .strict();
const responseSchema = z.object({
  ok: z.literal(true),
  finderSubmissionId: z.uuid(),
  finderAssetId: z.uuid(),
  imageUrl: z.url(),
  expiresAt: z.iso.datetime(),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  assetKind: z.enum(["original_label", "jewelry_front"]),
  byteSize: z.number().int().positive().max(1500000),
});
export async function readFinderReviewEvidence(input: Record<string, unknown>) {
  const parsed = inputSchema.parse(input),
    admin = createAdminClient();
  const token = process.env.SPARKLE_FINDER_CONTROL_CENTER_REVIEW_TOKEN;
  if (!token)
    throw new LocBridgeError(
      503,
      "The private Finder photo preview connection is not configured.",
    );
  const { data, error } = await admin
    .from("finder_studio_intake_v2")
    .select(
      "finder_submission_id,resolve_input,resolve_result,created_at,updated_at",
    )
    .eq("finder_submission_id", parsed.finderSubmissionId)
    .eq("stage", "publish_queued")
    .is("review_result", null)
    .maybeSingle();
  if (error) throw error;
  if (!data)
    throw new LocBridgeError(
      404,
      "That Finder submission is no longer queued for review.",
    );
  const queued = mapStudioReviewQueueRow(data);
  const evidence = queued.photoEvidence.assets.find(
    (asset) => asset.finderAssetId === parsed.finderAssetId,
  );
  if (!evidence)
    throw new LocBridgeError(
      404,
      "That photo is not evidence for this submission.",
    );
  const url = new URL(
    "https://yoursparklefinder.com/api/internal/finder/control-center-review-evidence",
  );
  url.searchParams.set("finderSubmissionId", parsed.finderSubmissionId);
  url.searchParams.set("finderAssetId", parsed.finderAssetId);
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15000),
    redirect: "error",
    cache: "no-store",
  });
  if (!response.ok)
    throw new LocBridgeError(
      response.status === 404 ? 404 : 503,
      "Finder could not provide this private photo preview.",
    );
  const raw = await response.text();
  if (Buffer.byteLength(raw) > 16000)
    throw new LocBridgeError(502, "Finder returned an invalid photo preview.");
  const result = responseSchema.parse(JSON.parse(raw)),
    image = new URL(result.imageUrl);
  if (
    result.finderSubmissionId !== parsed.finderSubmissionId ||
    result.finderAssetId !== parsed.finderAssetId ||
    result.assetKind !==
      (evidence.claimedKind === "label" ? "original_label" : "jewelry_front") ||
    image.protocol !== "https:" ||
    !image.hostname.endsWith(".supabase.co") ||
    !image.pathname.startsWith(
      "/storage/v1/object/sign/sparkle-finder-private/",
    ) ||
    image.username ||
    image.password ||
    Date.parse(result.expiresAt) <= Date.now() ||
    Date.parse(result.expiresAt) > Date.now() + 130000
  )
    throw new LocBridgeError(
      502,
      "Finder returned a mismatched photo preview.",
    );
  return result;
}
