import "server-only";
import { LocBridgeError } from "./security";
type Input = Record<string, unknown>;
type Handler = (
  request: Request,
  context: { params: Promise<Record<string, string>> },
) => Promise<Response>;
const routes: Record<
  string,
  { load: () => Promise<unknown>; method: string; operation?: string }
> = {
  "support.reports": {
    load: () => import("@/app/api/control-center/support-reports/route"),
    method: "GET",
  },
  "support.conversations": {
    load: () => import("@/app/api/control-center/conversations/route"),
    method: "GET",
  },
  "support.conversation": {
    load: () =>
      import("@/app/api/control-center/conversations/[conversationId]/route"),
    method: "GET",
  },
  "support.attachment": {
    load: () =>
      import(
        "@/app/api/control-center/conversations/[conversationId]/attachments/[attachmentId]/route"
      ),
    method: "GET",
  },
  "support.sessions": {
    load: () => import("@/app/api/control-center/support-sessions/route"),
    method: "GET",
  },
  "resources.list": {
    load: () => import("@/app/api/control-center/resources/route"),
    method: "GET",
  },
  "communications.list": {
    load: () => import("@/app/api/control-center/messages/route"),
    method: "GET",
  },
  "communications.preview": {
    load: () => import("@/app/api/control-center/messages/route"),
    method: "POST",
    operation: "preview",
  },
  "approvals.list": {
    load: () => import("@/app/api/control-center/remy-reply-approvals/route"),
    method: "GET",
  },
  "moderation.suspensions": {
    load: () =>
      import("@/app/api/control-center/rep-messaging-suspensions/route"),
    method: "GET",
  },
  "finder.reviews": {
    load: () => import("@/app/api/control-center/finder-studio-reviews/route"),
    method: "GET",
  },
  "tasks.create": {
    load: () => import("@/app/api/control-center/bug-hunt/route"),
    method: "POST",
  },
  "onboarding.checklist": {
    load: () => import("@/app/api/control-center/onboarding-checklist/route"),
    method: "PATCH",
  },
  "onboarding.waitlist.create": {
    load: () => import("@/app/api/control-center/customer-waitlist/route"),
    method: "POST",
  },
  "onboarding.waitlist.update": {
    load: () => import("@/app/api/control-center/customer-waitlist/route"),
    method: "PATCH",
  },
  "onboarding.waitlist.delete": {
    load: () => import("@/app/api/control-center/customer-waitlist/route"),
    method: "DELETE",
  },
  "support.status": {
    load: () =>
      import(
        "@/app/api/control-center/support-reports/[reportId]/status/route"
      ),
    method: "PATCH",
  },
  "support.promote": {
    load: () =>
      import(
        "@/app/api/control-center/support-reports/[reportId]/promote-task/route"
      ),
    method: "POST",
  },
  "support.reply": {
    load: () =>
      import(
        "@/app/api/control-center/conversations/[conversationId]/messages/route"
      ),
    method: "POST",
  },
  "approvals.decide": {
    load: () => import("@/app/api/control-center/remy-reply-approvals/route"),
    method: "POST",
  },
  "moderation.conversation": {
    load: () =>
      import(
        "@/app/api/control-center/conversations/[conversationId]/moderate/route"
      ),
    method: "POST",
  },
  "moderation.suspension": {
    load: () =>
      import("@/app/api/control-center/rep-messaging-suspensions/route"),
    method: "PATCH",
  },
  "communications.draft": {
    load: () => import("@/app/api/control-center/messages/route"),
    method: "POST",
    operation: "save_draft",
  },
  "communications.publish": {
    load: () => import("@/app/api/control-center/messages/route"),
    method: "POST",
    operation: "publish",
  },
  "resources.publish": {
    load: () => import("@/app/api/control-center/resources/route"),
    method: "POST",
  },
  "finder.appearance.update": {
    load: () => import("@/app/api/control-center/finder-appearance/route"),
    method: "PATCH",
  },
  "finder.review.update": {
    load: () => import("@/app/api/control-center/finder-studio-reviews/route"),
    method: "PATCH",
  },
  "lab.run": {
    load: () => import("@/app/api/control-center/sparkle-lab/run/route"),
    method: "POST",
  },
  "onboarding.contact-batch": {
    load: () =>
      import("@/app/api/control-center/intake/waitlist-contact-batch/route"),
    method: "POST",
  },
  "onboarding.contact-progress": {
    load: () =>
      import("@/app/api/control-center/intake/waitlist-contact-progress/route"),
    method: "POST",
  },
  "onboarding.meeting-scheduled": {
    load: () =>
      import(
        "@/app/api/control-center/intake/waitlist-meeting-scheduled/route"
      ),
    method: "POST",
  },
  "onboarding.conversation-complete": {
    load: () =>
      import(
        "@/app/api/control-center/intake/waitlist-conversation-complete/route"
      ),
    method: "POST",
  },
  "onboarding.setup-profile-drafted": {
    load: () =>
      import(
        "@/app/api/control-center/intake/waitlist-setup-profile-drafted/route"
      ),
    method: "POST",
  },
  "onboarding.start-work-ready": {
    load: () =>
      import("@/app/api/control-center/intake/waitlist-start-work-ready/route"),
    method: "POST",
  },
  "onboarding.setup-profile": {
    load: () => import("@/app/api/control-center/intake/setup-profile/route"),
    method: "POST",
  },
  "onboarding.agreement-document": {
    load: () =>
      import("@/app/api/control-center/intake/agreement-document/route"),
    method: "POST",
  },
  "onboarding.launch-build-draft": {
    load: () =>
      import("@/app/api/control-center/intake/launch-build-draft/route"),
    method: "POST",
  },
  "onboarding.production-roster": {
    load: () =>
      import("@/app/api/control-center/intake/production-roster/route"),
    method: "POST",
  },
  "onboarding.launch-check": {
    load: () => import("@/app/api/control-center/intake/launch-check/route"),
    method: "POST",
  },
  "onboarding.launch-gate": {
    load: () => import("@/app/api/control-center/intake/launch-gate/route"),
    method: "POST",
  },
};
export async function runExistingLocRoute(name: string, input: Input) {
  const route = routes[name];
  if (!route) throw new LocBridgeError(404, "Unknown operation.");
  const params: Record<string, string> = {};
  for (const key of ["conversationId", "attachmentId", "reportId", "sessionId"])
    if (input[key] !== undefined) {
      if (
        typeof input[key] !== "string" ||
        !/^[a-zA-Z0-9_-]{1,100}$/.test(input[key])
      )
        throw new LocBridgeError(400, "Invalid target ID.");
      params[key] = input[key];
    }
  const body = { ...input };
  delete body.product;
  if (route.operation) body.operation = route.operation;
  const url = new URL(
    "https://www.yoursparklesuite.com/api/internal/loc-control-center",
  );
  if (route.method === "GET")
    for (const [key, value] of Object.entries(body))
      if (value !== undefined && value !== null)
        url.searchParams.set(key, String(value));
  const module = (await route.load()) as Record<string, Handler>;
  const result = await module[route.method](
    new Request(url, {
      method: route.method,
      headers: { "content-type": "application/json" },
      ...(route.method === "GET" ? {} : { body: JSON.stringify(body) }),
    }),
    { params: Promise.resolve(params) },
  );
  const payload = await result.json();
  if (!result.ok)
    throw new LocBridgeError(
      result.status,
      typeof payload.error === "string"
        ? payload.error
        : "The product operation did not complete.",
    );
  return payload;
}
