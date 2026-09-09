import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { listOperatorCustomerProfiles } from "@/lib/services/client-account-profiles";
import { listOperatorOnboardingChecklists } from "@/lib/services/operator-onboarding-checklists";
import {
  BUG_HUNT_SELECT,
  normalizeBugHuntItem,
} from "@/lib/control-center/bug-hunt";
import {
  loadCurrentAccountingSnapshot,
  loadSparkleSuiteAccountingProjection,
} from "@/lib/control-center/accounting";
import { getControlCenterOperatorHealth } from "@/lib/remy-communications/operator-health";
import { getControlCenterNicNacUsage } from "@/lib/remy-communications/nic-nac-usage";
import {
  getNicNacCostCapacity,
  readCostCapacityRuns,
  formatCostCapacityCsv,
} from "@/lib/remy-communications/nic-nac-cost-capacity";
import {
  CUSTOMER_WAITLIST_SELECT,
  normalizeCustomerWaitlistRow,
  type CustomerWaitlistRow,
} from "@/lib/prelaunch/customer-waitlist";
import {
  loadSparkleFinderAppearanceSetting,
  resolveSparkleFinderAppearance,
} from "@/lib/sparkle-finder/appearance";
import { SPARKLE_FINDER_APPEARANCE_PRESET_IDS } from "@/lib/sparkle-finder/appearance-presets";
import { readSparkleLabControlCenterModel } from "@/lib/sparkle-lab/read-model";
import { LocBridgeError } from "./security";
import { runExistingLocRoute } from "./legacy-routes";
import {
  loadStudioCandidates,
  mapStudioReviewQueueRow,
} from "@/lib/sparkle-finder/studio-intake-v2";
import { getLocOperatorContext } from "./context";
import {
  getOperatorConversation,
  listOperatorConversations,
} from "@/lib/services/workspace-conversations";
import {
  listOperatorSupportReports,
  type SupportReportStatus,
} from "@/lib/services/support-reports";
import type {
  WorkspaceConversationState,
  WorkspaceConversationType,
} from "@/lib/services/workspace-conversation-permissions";
import { listOperatorSupportSessions } from "@/lib/operator-support/session-service";
import { mapOperatorSupportSessionSummary } from "@/lib/operator-support/http";
import { readFinderReviewEvidence } from "./finder-evidence";
import { listRemyReplyApprovals } from '@/lib/remy-communications/reply-approvals'

type Input = Record<string, unknown>;
function pagination(input: Input) {
  const limit = input.limit ?? 50,
    offset = input.offset ?? 0;
  if (
    !Number.isInteger(limit) ||
    Number(limit) < 1 ||
    Number(limit) > 100 ||
    !Number.isInteger(offset) ||
    Number(offset) < 0 ||
    Number(offset) > 1_000_000
  )
    throw new LocBridgeError(400, "Invalid page.");
  return { limit: Number(limit), offset: Number(offset) };
}
async function count(table: string, filter?: [string, string]) {
  let query = createAdminClient()
    .from(table)
    .select("id", { count: "exact", head: true });
  if (filter) query = query.eq(filter[0], filter[1]);
  const result = await query;
  if (result.error) throw result.error;
  return result.count;
}
export async function readLocOperation(
  name: string,
  input: Input,
): Promise<unknown> {
  const admin = createAdminClient();
  const product = input.product === "finder" ? "finder" : "suite";
  if(name==='approvals.list')return {ok:true,approvals:await listRemyReplyApprovals(admin,{status:'requested',limit:100,expireRequests:false})}
  if (name === "finder.review.evidence") return readFinderReviewEvidence(input);
  if (name === "finder.review.candidates") {
    if (typeof input.finderSubmissionId !== "string")
      throw new LocBridgeError(400, "Choose a queued Finder submission.");
    const { data, error } = await admin
      .from("finder_studio_intake_v2")
      .select(
        "finder_submission_id,resolve_input,resolve_result,created_at,updated_at",
      )
      .eq("finder_submission_id", input.finderSubmissionId)
      .eq("stage", "publish_queued")
      .is("review_result", null)
      .maybeSingle();
    if (error) throw error;
    if (!data)
      throw new LocBridgeError(
        404,
        "That submission is no longer awaiting review.",
      );
    const review = mapStudioReviewQueueRow(data);
    const candidates = review.catalogDraft.itemNumber
      ? await loadStudioCandidates(admin, review.catalogDraft.itemNumber)
      : [];
    return {
      finderSubmissionId: review.finderSubmissionId,
      items: candidates.slice(0, 50),
      tooMany: candidates.length > 50,
    };
  }
  if (name === "support.reports") {
    const { limit, offset } = pagination(input);
    const reports = await listOperatorSupportReports(admin, {
      limit,
      offset,
      status: input.status as SupportReportStatus | undefined,
    });
    return {
      reports,
      nextOffset: reports.length === limit ? offset + limit : null,
    };
  }
  if (name === "support.conversations") {
    const { limit, offset } = pagination(input);
    const type =
      input.type === "rep_network"
        ? "rep_direct"
        : input.type === "team"
          ? "team_onboarding"
          : input.type;
    const result = await listOperatorConversations(admin, {
      limit,
      offset,
      type: type as WorkspaceConversationType | undefined,
      state: input.state as WorkspaceConversationState | undefined,
      reportedOnly:
        input.reportedOnly === true || input.reportedOnly === "true",
    });
    return {
      ...result,
      nextOffset: result.conversations.length === limit ? offset + limit : null,
    };
  }
  if (name === "support.conversation") {
    if (typeof input.conversationId !== "string")
      throw new LocBridgeError(400, "Choose a conversation.");
    return {
      detail: await getOperatorConversation(admin, input.conversationId, {
        markRead: false,
      }),
    };
  }
  if (name === "support.sessions") {
    const operatorRepId = getLocOperatorContext()?.operator.repId;
    if (!operatorRepId)
      throw new LocBridgeError(403, "Operator context is missing.");
    const sessions = await listOperatorSupportSessions(admin, {
      operatorRepId,
      targetRepId:
        typeof input.targetRepId === "string" ? input.targetRepId : undefined,
      limit: 50,
    });
    return {
      sessions: sessions.map(mapOperatorSupportSessionSummary),
      executionSurface: "existing_control_center",
    };
  }
  if (name === "overview") {
    if (product === "finder")
      return {
        product,
        appearance: await loadSparkleFinderAppearanceSetting(admin),
        accounting: await loadCurrentAccountingSnapshot(admin, product),
        customerStatus:
          "Finder customer data remains in Finder; this service does not copy it.",
      };
    const [customers, demos, tasks, support, waitlist] = await Promise.all([
      count("reps", ["account_classification", "customer"]),
      count("reps", ["account_classification", "demo"]),
      count("sparkle_suite_bug_hunt_items"),
      count("support_reports"),
      count("sparkle_suite_waitlist"),
    ]);
    return { product, customers, demos, tasks, support, waitlist };
  }
  if (name === "customers.list" || name === "customers.detail") {
    const { limit, offset } = pagination(input);
    const repId = typeof input.repId === "string" ? input.repId : "";
    if (name === "customers.detail" && !repId)
      throw new LocBridgeError(400, "Choose a customer.");
    const items = await listOperatorCustomerProfiles(admin, {
      limit: name === "customers.detail" ? 1 : limit + 1,
      offset,
      query: typeof input.query === "string" ? input.query : undefined,
      classification:
        input.classification === "customer" || input.classification === "demo"
          ? input.classification
          : undefined,
      ...(repId ? { repIds: [repId] } : {}),
    });
    const visible = items.slice(0, limit);
    const checklists = await listOperatorOnboardingChecklists(
      admin,
      visible.map((item) => item.repId),
    );
    if (name === "customers.detail") {
      if (!items[0]) throw new LocBridgeError(404, "Customer not found.");
      return { customer: items[0], checklist: checklists[repId] };
    }
    return {
      items: visible,
      checklists,
      nextOffset: items.length > limit ? offset + limit : null,
    };
  }
  if (name === "tasks.list") {
    const { limit, offset } = pagination(input);
    let query = admin
      .from("sparkle_suite_bug_hunt_items")
      .select(BUG_HUNT_SELECT)
      .order("updated_at", { ascending: false })
      .order("id", { ascending: true });
    if (input.status) query = query.eq("status", String(input.status));
    if (input.excludeComplete === true) query = query.neq("status", "complete");
    if (input.updatedSince) {
      const since = new Date(String(input.updatedSince));
      if (!Number.isFinite(since.getTime()))
        throw new LocBridgeError(400, "Choose a valid updated date.");
      query = query.gte("updated_at", since.toISOString());
    }
    if (input.priority) query = query.eq("priority", String(input.priority));
    if (input.query) {
      const term = String(input.query)
        .replace(/[,"\\()%_*]/g, " ")
        .slice(0, 240);
      query = query.or(
        `title.ilike.%${term}%,details.ilike.%${term}%,owner.ilike.%${term}%`,
      );
    }
    const { data, error } = await query.range(offset, offset + limit);
    if (error) throw error;
    return {
      items: (data ?? [])
        .slice(0, limit)
        .map((row) => normalizeBugHuntItem(row)),
      nextOffset: (data ?? []).length > limit ? offset + limit : null,
    };
  }
  if (name === "onboarding.waitlist") {
    const { limit, offset } = pagination(input);
    const { data, error } = await admin
      .from("sparkle_suite_waitlist")
      .select(CUSTOMER_WAITLIST_SELECT)
      .order("created_at", { ascending: false })
      .order("id")
      .range(offset, offset + limit);
    if (error) throw error;
    return {
      items: ((data ?? []) as unknown as CustomerWaitlistRow[])
        .slice(0, limit)
        .map(normalizeCustomerWaitlistRow),
      nextOffset: (data ?? []).length > limit ? offset + limit : null,
    };
  }
  if (name === "accounting.snapshot")
    return {
      product,
      snapshot: await loadCurrentAccountingSnapshot(admin, product),
      projection:
        product === "suite"
          ? await loadSparkleSuiteAccountingProjection(admin)
          : null,
    };
  if (name === "usage.snapshot") {
    const snapshot = await getNicNacCostCapacity(
      admin,
      typeof input.month === "string" ? input.month : undefined,
    );
    const selected = snapshot.products.filter(
      (row) => row.productClass === product,
    );
    return {
      product,
      month: snapshot.month,
      monthLabel: snapshot.monthLabel,
      generatedAt: snapshot.generatedAt,
      telemetryAt: snapshot.telemetryAt,
      providerCostsAt: snapshot.providerCostsAt,
      rowsTruncated: snapshot.rowsTruncated,
      products: selected,
      totals: selected[0] ?? null,
      byModel: snapshot.byModel.filter((row) => row.productClass === product),
      modelPolicies: snapshot.modelPolicies.filter(
        (row) => row.productClass === product,
      ),
      recentRuns: snapshot.recentRuns.filter(
        (row) => row.productClass === product,
      ),
      provider: { [product]: snapshot.provider[product] },
      coverageHoles: [snapshot.provider[product].issue].filter(Boolean),
    };
  }
  if (name === "usage.export") {
    const rows = await readCostCapacityRuns(
      admin,
      typeof input.month === "string" ? input.month : undefined,
    );
    return {
      contentType: "text/csv",
      filename: `${product}-usage-${rows.month}.csv`,
      content: formatCostCapacityCsv(
        product === "suite" ? rows.suiteRows : rows.finderRows,
      ),
      truncated: rows.rowsTruncated,
    };
  }
  if (name === "health.snapshot") {
    const [health, usage] = await Promise.all([
      getControlCenterOperatorHealth(admin),
      getControlCenterNicNacUsage(admin),
    ]);
    return { health, usage };
  }
  if (name === "finder.appearance")
    return {
      appearance: await loadSparkleFinderAppearanceSetting(admin),
      presets: SPARKLE_FINDER_APPEARANCE_PRESET_IDS.map(
        resolveSparkleFinderAppearance,
      ),
    };
  if (name === "lab.snapshot") return readSparkleLabControlCenterModel(admin);
  if (name === "onboarding.intake") {
    const [
      { loadPrelaunchIntakeReviewSubmissions },
      { loadPrelaunchWaitlistReviewLeads },
      { loadPrelaunchLaunchBuilds },
      { loadPrelaunchLaunchSetupProfilesByBuildIds },
      { loadPrelaunchLaunchChecksByBuildIds },
      { loadPrelaunchLaunchGatesByBuildIds },
      { loadPrelaunchAgreementDocumentsByBuildIds },
    ] = await Promise.all([
      import("@/lib/prelaunch/intake-review-query"),
      import("@/lib/prelaunch/waitlist-review"),
      import("@/lib/prelaunch/launch-builds"),
      import("@/lib/prelaunch/setup-profiles"),
      import("@/lib/prelaunch/launch-checks"),
      import("@/lib/prelaunch/launch-gates"),
      import("@/lib/prelaunch/agreement-documents"),
    ]);
    const [submissions, waitlistLeads, launchBuilds] = await Promise.all([
      loadPrelaunchIntakeReviewSubmissions(),
      loadPrelaunchWaitlistReviewLeads(),
      loadPrelaunchLaunchBuilds(),
    ]);
    const ids = launchBuilds.map((build) => build.id);
    const [launchSetupProfiles, launchChecks, launchGates, agreementDocuments] =
      await Promise.all([
        loadPrelaunchLaunchSetupProfilesByBuildIds(ids),
        loadPrelaunchLaunchChecksByBuildIds(ids),
        loadPrelaunchLaunchGatesByBuildIds(ids),
        loadPrelaunchAgreementDocumentsByBuildIds(ids),
      ]);
    return {
      submissions,
      waitlistLeads,
      launchBuilds,
      launchSetupProfiles,
      launchChecks,
      launchGates,
      agreementDocuments,
    };
  }
  return runExistingLocRoute(name, input);
}
