export type LocProduct = "suite" | "finder";
export type LocOperation = {
  name: string;
  products: LocProduct[];
  area: string;
  effect: "read" | "draft" | "write";
  description: string;
  ownerOnly?: boolean;
  targetKeys: string[];
  inputSchema: Record<string, unknown>;
};
const objectSchema = (
  properties: Record<string, unknown> = {},
  required: string[] = [],
) => ({
  type: "object",
  properties: { product: { enum: ["suite", "finder"] }, ...properties },
  required,
  additionalProperties: true,
});
const string = { type: "string", minLength: 1, maxLength: 4000 };
const optionalText = { type: "string", maxLength: 4000 };
const page = {
  offset: { type: "integer", minimum: 0 },
  limit: { type: "integer", minimum: 1, maximum: 100 },
  query: { type: "string", maxLength: 240 },
};
const read = (
  name: string,
  area: string,
  description: string,
  products: LocProduct[] = ["suite"],
  properties: Record<string, unknown> = {},
  targets: string[] = [],
): LocOperation => ({
  name,
  area,
  description,
  products,
  effect: "read",
  targetKeys: targets,
  inputSchema: objectSchema(properties, targets),
});
const write = (
  name: string,
  area: string,
  description: string,
  targetKeys: string[] = [],
  products: LocProduct[] = ["suite"],
  properties: Record<string, unknown> = {},
  effect: "draft" | "write" = "write",
): LocOperation => ({
  name,
  area,
  description,
  products,
  effect,
  targetKeys,
  inputSchema: objectSchema(properties, targetKeys),
});
// This is the complete allowlist. No caller-provided route, HTTP method, SQL,
// role, or operator identity is accepted by dispatch.
export const locOperationCatalog: LocOperation[] = [
  read(
    "finder.review.evidence",
    "studio",
    "Short-lived private image preview for an exact photo belonging to a current queued submission.",
    ["finder"],
    { finderSubmissionId: string, finderAssetId: string },
    ["finderSubmissionId", "finderAssetId"],
  ),
  read(
    "support.session.inspect",
    "support",
    "Inspect the exact LOC-owned support session and its expiry.",
    ["suite"],
    { sessionId: string },
    ["sessionId"],
  ),
  write(
    "support.session.start",
    "support",
    "Start disclosed support only after the original customer notice succeeds.",
    ["targetRepId"],
    ["suite"],
    {
      targetRepId: string,
      reasonCode: {
        enum: [
          "account_setup",
          "troubleshooting",
          "support_request",
          "content_update",
          "other",
        ],
      },
      reasonNote: optionalText,
      supportReportId: string,
    },
  ),
  write(
    "support.session.end",
    "support",
    "End support access and issue the original customer-safe completion notice.",
    ["sessionId"],
    ["suite"],
    {
      sessionId: string,
      completionSummary: optionalText,
      changedAnything: { type: "boolean" },
    },
  ),
  ...[
    "profile",
    "site-settings",
    "calendar",
    "customers",
    "trade-board",
    "fulfillment",
    "jewelry",
    "resources",
    "reports",
    "history",
  ].map((area) =>
    read(
      `support.workspace.${area}`,
      "support",
      `Read ${area} for the fixed disclosed support target through the existing audited gateway.`,
      ["suite"],
      { sessionId: string, query: { type: "object" } },
      ["sessionId"],
    ),
  ),
  write(
    "support.workspace.site-settings.update",
    "support",
    "Save allowed customer-site settings through the existing support capability and audit gates.",
    ["sessionId"],
    ["suite"],
    { sessionId: string, settings: { type: "object" } },
  ),
  read(
    "finder.review.candidates",
    "studio",
    "Exact catalog variants for one current queued submission; item number resolved server-side.",
    ["finder"],
    { finderSubmissionId: string },
    ["finderSubmissionId"],
  ),
  read("overview", "overview", "Current source counts and product status.", [
    "suite",
    "finder",
  ]),
  read(
    "customers.list",
    "customers",
    "Customer/demo records and onboarding checklists.",
    ["suite"],
    page,
  ),
  read(
    "customers.detail",
    "customers",
    "One exact customer record and onboarding checklist.",
    ["suite"],
    { repId: string },
    ["repId"],
  ),
  read(
    "tasks.list",
    "tasks",
    "Existing durable Task List, paginated.",
    ["suite"],
    { ...page, status: string, priority: string },
  ),
  read(
    "support.reports",
    "support",
    "Support reports using existing filters.",
    ["suite"],
    page,
  ),
  read(
    "support.conversations",
    "support",
    "Support and network conversation inbox.",
    ["suite"],
    { ...page, type: string, state: string },
  ),
  read(
    "support.conversation",
    "support",
    "Conversation messages, reports and attachment references.",
    ["suite"],
    { conversationId: string },
    ["conversationId"],
  ),
  read(
    "support.attachment",
    "support",
    "Short-lived authorized attachment download.",
    ["suite"],
    { conversationId: string, attachmentId: string },
    ["conversationId", "attachmentId"],
  ),
  read(
    "support.sessions",
    "support",
    "Transparent support access history; existing Workspace remains the session execution surface.",
    ["suite"],
    { targetRepId: string },
  ),
  read(
    "onboarding.waitlist",
    "onboarding",
    "Current customer waitlist.",
    ["suite"],
    page,
  ),
  read(
    "onboarding.intake",
    "onboarding",
    "Intake submissions, launch builds and associated gates/profiles.",
    ["suite"],
  ),
  read(
    "accounting.snapshot",
    "accounting",
    "Separate authoritative snapshot and clearly labeled projection; no payment actions.",
    ["suite", "finder"],
  ),
  read(
    "usage.snapshot",
    "usage",
    "Nic-Nac cost and capacity, missing sources and estimates.",
    ["suite", "finder"],
    { month: { type: "string", pattern: "^\\d{4}-\\d{2}$" } },
  ),
  read(
    "usage.export",
    "usage",
    "CSV of authorized usage rows.",
    ["suite", "finder"],
    { month: string },
  ),
  read(
    "health.snapshot",
    "guardian",
    "Read-only Guardian health flags and agent usage.",
    ["suite"],
  ),
  read(
    "resources.list",
    "resources",
    "Existing Help and Resources publication history.",
  ),
  read(
    "communications.list",
    "communications",
    "Broadcasts and recipient status.",
  ),
  read(
    "communications.preview",
    "communications",
    "Exact recipient preview, without sending.",
  ),
  read("approvals.list", "support", "Pending exact Remy reply approvals."),
  read(
    "moderation.suspensions",
    "support",
    "Current network messaging restrictions.",
  ),
  read(
    "finder.appearance",
    "appearance",
    "Current Finder appearance and available presets.",
    ["finder"],
  ),
  read(
    "finder.reviews",
    "studio",
    "Suite-side Finder Studio intake reviews.",
    ["finder"],
    page,
  ),
  read(
    "lab.snapshot",
    "lab",
    "Sparkle Lab findings, artifacts and run history.",
  ),
  read(
    "receipts.get",
    "receipts",
    "Reconcile one previous operation; never repeats a write.",
    ["suite", "finder"],
    { operationId: string },
    ["operationId"],
  ),
  write(
    "tasks.create",
    "tasks",
    "Create one durable Task List item.",
    [],
    ["suite"],
    {
      title: { ...string, maxLength: 240 },
      itemType: {
        enum: ["bug", "update", "research", "content", "operations"],
      },
      priority: { enum: ["urgent", "high", "medium", "low"] },
      details: optionalText,
      owner: { ...optionalText, maxLength: 160 },
      source: { ...optionalText, maxLength: 240 },
    },
  ),
  write(
    "tasks.update",
    "tasks",
    "Update a task only when its last-observed revision still matches.",
    ["id"],
    ["suite"],
    {
      id: string,
      expectedUpdatedAt: string,
      details: optionalText,
      owner: { ...optionalText, maxLength: 160 },
      priority: { enum: ["urgent", "high", "medium", "low"] },
      status: { enum: ["open", "in_progress", "blocked", "complete"] },
    },
  ),
  write(
    "onboarding.checklist",
    "onboarding",
    "Set one existing onboarding checkbox.",
    ["repId"],
    ["suite"],
    { repId: string, itemKey: string, isCompleted: { type: "boolean" } },
  ),
  write(
    "onboarding.waitlist.create",
    "onboarding",
    "Add one manual waitlist record.",
  ),
  write(
    "onboarding.waitlist.update",
    "onboarding",
    "Update an existing waitlist record.",
    ["id"],
  ),
  write(
    "onboarding.waitlist.delete",
    "onboarding",
    "Remove the selected waitlist entry.",
    ["id"],
  ),
  ...[
    "contact-batch",
    "contact-progress",
    "meeting-scheduled",
    "conversation-complete",
    "setup-profile-drafted",
    "start-work-ready",
  ].map((action) =>
    write(
      `onboarding.${action}`,
      "onboarding",
      `Existing intake ${action} workflow; preserve its contact and launch gates.`,
      ["leadId"],
    ),
  ),
  ...[
    "setup-profile",
    "agreement-document",
    "launch-build-draft",
    "production-roster",
    "launch-check",
    "launch-gate",
  ].map((action) =>
    write(
      `onboarding.${action}`,
      "onboarding",
      `Existing ${action} workflow with original validation and business policy.`,
      action === "launch-build-draft"
        ? ["waitlistId", "intakeSubmissionId"]
        : ["launchBuildId"],
    ),
  ),
  write(
    "support.status",
    "support",
    "Transition exact report/conversation status.",
    ["reportId"],
  ),
  write(
    "support.promote",
    "support",
    "Promote exact report to the existing Task List.",
    ["reportId"],
  ),
  write(
    "support.reply",
    "support",
    "Send an exact owner-approved support reply.",
    ["conversationId"],
  ),
  write(
    "approvals.decide",
    "support",
    "Owner decision on one exact Remy support reply approval.",
    ["requestId"],
  ),
  write(
    "moderation.conversation",
    "support",
    "Apply existing conversation moderation policy.",
    ["conversationId"],
  ),
  write(
    "moderation.suspension",
    "support",
    "Change selected rep network messaging restriction.",
    ["repId"],
  ),
  write(
    "communications.draft",
    "communications",
    "Save a durable message draft without publishing.",
    [],
    ["suite"],
    {},
    "draft",
  ),
  write(
    "communications.publish",
    "communications",
    "Publish exact previewed recipients and approved content.",
  ),
  write(
    "resources.publish",
    "resources",
    "Publish a resource with explicit announcement choice.",
  ),
  write(
    "finder.appearance.update",
    "appearance",
    "Save a known appearance preset.",
    [],
    ["finder"],
    { appearancePreset: string },
  ),
  write(
    "finder.review.update",
    "studio",
    "Apply an existing Studio review decision.",
    ["finderSubmissionId", "suiteDesignId"],
    ["finder"],
  ),
  write(
    "lab.run",
    "lab",
    "Run an allowed manual Lab scan within existing limits.",
  ),
];
export function findLocOperation(name: string) {
  return locOperationCatalog.find((operation) => operation.name === name);
}

// Fields needed for useful tool discovery, in addition to the original handler's
// authoritative validation. All operational target keys are explicit.
const requiredByName: Record<string, string[]> = {
  "tasks.create": ["title", "itemType"],
  "tasks.update": ["id", "expectedUpdatedAt"],
  "onboarding.checklist": ["repId", "itemKey", "isCompleted"],
  "onboarding.waitlist.update":["id","expectedUpdatedAt"],
  "onboarding.waitlist.delete":["id","expectedUpdatedAt"],
  "onboarding.setup-profile":["launchBuildId","expectedUpdatedAt","businessName"],
  "finder.appearance.update": ["appearancePreset"],
  "approvals.decide": ["requestId", "decision"],
  "moderation.suspension": ["repId", "suspended"],
  "support.reply": ["conversationId", "body", "clientRequestId"],
};
const boolean = { type: "boolean" };
const textList = { type: "array", items: { type: "string" }, maxItems: 12 };
const content = {
  publicationId: string,
  title: { ...string, maxLength: 160 },
  summary: { type: "string", maxLength: 500 },
  body: { ...string, maxLength: 20000 },
  category: {
    enum: [
      "announcement",
      "business_update",
      "customer_activity",
      "monthly_report",
      "platform_update",
      "help_update",
      "blog",
      "video",
    ],
  },
  priority: { enum: ["normal", "important", "action_required"] },
  actionUrl: { type: "string", maxLength: 2000 },
  audience: {
    type: "object",
    properties: {
      kind: { enum: ["all_active", "selected"] },
      repIds: { type: "array", items: string, minItems: 1, maxItems: 500 },
    },
    required: ["kind"],
  },
};
const fieldsByName: Record<string, Record<string, unknown>> = {
  'customers.list':{classification:{enum:['customer','demo']}},
  'tasks.list':{updatedSince:{type:'string',format:'date-time'},excludeComplete:boolean},
  "support.reply": {
    body: { ...string, maxLength: 10000 },
    clientRequestId: { ...string, minLength: 8, maxLength: 180 },
  },
  "support.status": {
    status: { enum: ["open", "reviewing", "planned", "resolved", "closed"] },
    clientAccountProfileId: string,
    affectedArea: string,
    symptom: string,
    rootCause: string,
    fixOrWorkaround: string,
    tags: textList,
    approvedForReuse: boolean,
  },
  "support.promote": {
    title: { ...string, minLength: 3, maxLength: 240 },
    notes: optionalText,
    details: optionalText,
    itemType: { enum: ["bug", "update", "research", "content", "operations"] },
    priority: { enum: ["urgent", "high", "medium", "low"] },
    owner: { ...optionalText, maxLength: 160 },
  },
  "approvals.decide": {
    decision: { enum: ["approve", "decline"] },
    note: { type: "string", maxLength: 500 },
  },
  "moderation.conversation": {
    action: {
      enum: [
        "dismiss_report",
        "remove_message",
        "close_conversation",
        "suspend_sender",
      ],
    },
    reason: { ...string, minLength: 3, maxLength: 2000 },
    reportId: string,
    messageId: string,
  },
  "moderation.suspension": {
    suspended: boolean,
    reason: { type: "string", maxLength: 2000 },
  },
  "onboarding.waitlist.create": {
    name: string,
    email: string,
    phone: optionalText,
    notes: optionalText,
  },
  "onboarding.waitlist.update": { notes: optionalText, accountActivated: boolean,expectedUpdatedAt:{type:'string',format:'date-time'} },
  'onboarding.waitlist.delete':{expectedUpdatedAt:{type:'string',format:'date-time'}},
  "onboarding.meeting-scheduled": {
    consultScheduledAt: string,
    consultMeetingUrl: optionalText,
    consultNotes: optionalText,
  },
  "onboarding.setup-profile": {
    expectedUpdatedAt:{type:['string','null'],format:'date-time'},
    businessName: string,
    publicSiteGoal: optionalText,
    customDomain: optionalText,
    primarySocialUrl: optionalText,
    secondarySocialUrl: optionalText,
    shopUrl: optionalText,
    brandNotes: optionalText,
    mustHaveLaunchNotes: optionalText,
    openQuestions: textList,
    status: string,
  },
  "onboarding.agreement-document": {
    providerDocumentId: optionalText,
    providerStatus: optionalText,
    createSandboxDraft: boolean,
    sendTestAgreement: boolean,
    markSigned: boolean,
    signedAt: optionalText,
    signedPdfUrl: optionalText,
    notes: optionalText,
  },
  "onboarding.production-roster": {
    repId: string,
    createClientAccount: boolean,
    temporaryPassword: { type: "string", writeOnly: true },
    temporaryPasswordConfirm: { type: "string", writeOnly: true },
    notes: optionalText,
  },
  "onboarding.launch-check": {
    checkKey: string,
    status: string,
    notes: optionalText,
  },
  "onboarding.launch-gate": { gateKey: string, status: string, notes: optionalText },
  "communications.preview": content,
  "communications.draft": content,
  "communications.publish": {
    ...content,
    audienceToken: { ...string, minLength: 16, maxLength: 128 },
    expectedRecipientCount: { type: "integer", minimum: 1, maximum: 10000 },
    confirmed: boolean,
  },
  "resources.publish": {
    resourceKey: { type: "string", maxLength: 120 },
    resourceType: { enum: ["help", "faq", "blog", "video"] },
    title: { type: "string", maxLength: 160 },
    summary: { type: "string", maxLength: 500 },
    body: { type: "string", maxLength: 30000 },
    category: string,
    tags: textList,
    thumbnailUrl: optionalText,
    videoProvider: { enum: ["youtube", "vimeo", "loom", "other"] },
    videoUrl: optionalText,
    actionUrl: optionalText,
    changeSummary: optionalText,
    isFeatured: boolean,
    authorLabel: optionalText,
    announce: boolean,
  },
  "finder.review.update": { reviewNote: { type: "string", maxLength: 2000 } },
  "lab.run": { runType: { enum: ["manual", "urgent"] } },
};
for (const operation of locOperationCatalog) {
  const schema = operation.inputSchema as {
    properties: Record<string, unknown>;
    required: string[];
  };
  for (const key of operation.targetKeys)
    if (!schema.properties[key]) schema.properties[key] = string;
  Object.assign(schema.properties, fieldsByName[operation.name] ?? {});
  operation.ownerOnly =
    operation.name === "finder.review.evidence" ||
    operation.name.startsWith("support.session.") ||
    operation.name.startsWith("support.workspace.") ||
    (operation.effect !== "read" &&
      !["tasks.create", "tasks.update", "onboarding.checklist"].includes(
        operation.name,
      ));
  schema.required = [
    ...new Set([...schema.required, ...(requiredByName[operation.name] ?? [])]),
  ];
  if (operation.name === "onboarding.launch-build-draft")
    schema.required = ["waitlistId"];
}
