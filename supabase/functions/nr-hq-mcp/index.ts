import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPTransport } from "@hono/mcp";
import { Hono } from "hono";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MCP_ACCESS_KEY = Deno.env.get("MCP_ACCESS_KEY")!;
const DEFAULT_PROJECT = Deno.env.get("NR_HQ_DEFAULT_PROJECT") ?? "sparkle_suite";
const OPEN_ITEMS_DEFAULT_PROJECT = "neon_rabbit";

// Read client (anon + RLS) — used by the 5 get_* tools.
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// Write client (service_role) — used by the 12 write/CRUD tools.
const supabaseWrite = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Enum constants — mirror CHECK constraints in migration-008 + migration-010.
const PHASE_STATUSES   = ["not_started", "in_progress", "testing", "complete"] as const;
const TASK_STATUSES    = ["not_started", "in_progress", "complete", "blocked"] as const;
const EXECUTION_MODES  = ["ultraplan", "standard", "claude_chat", "manual"] as const;
const ASSIGNEES        = ["claude_code", "louis", "both", "opus_chat"] as const;
const GATE_STATUSES    = ["locked", "testing", "passed", "failed"] as const;
const CARD_POSITIONS   = ["previous", "current", "next"] as const;

// Open items enums — sourced from migration 011_nr_open_items.sql.
const OPEN_ITEM_CATEGORIES = ["gap", "legal", "decision", "research", "grey_area", "task"] as const;
const OPEN_ITEM_STATUSES   = ["open", "deferred", "in_progress", "resolved"] as const;
const OPEN_ITEM_PRIORITIES = ["low", "medium", "high"] as const;

// Audit log enums — sourced from migration 013_build_action_log_audit.sql.
const AUDIT_ACTORS  = ["chat", "claude_code"] as const;
const AUDIT_TARGETS = ["task", "phase", "gate", "action_card"] as const;

type Envelope = Record<string, unknown>;

function textResult(obj: Envelope) {
  return {
    content: [
      { type: "text" as const, text: JSON.stringify(obj, null, 2) },
    ],
  };
}

function errorResult(msg: string) {
  return {
    content: [{ type: "text" as const, text: `Error: ${msg}` }],
    isError: true,
  };
}

function hasMore(offset: number, returned: number, total: number | null) {
  if (total === null) return false;
  return offset + returned < total;
}

// --- MCP Server ---

const server = new McpServer({
  name: "nr-hq",
  version: "1.0.0",
});

// Tool: get_phases
server.registerTool(
  "get_phases",
  {
    title: "Get Build Phases",
    description:
      "List construction phases for a project, ordered by display_order. Supports optional status filter and pagination.",
    inputSchema: {
      project: z.string().min(1).max(128).optional().describe("Project id (default: sparkle_suite)"),
      status: z.enum(PHASE_STATUSES).optional(),
      limit: z.number().int().min(1).max(200).optional().default(50),
      offset: z.number().int().min(0).optional().default(0),
    },
  },
  async ({ project, status, limit, offset }) => {
    try {
      const p = project ?? DEFAULT_PROJECT;
      let q = supabase
        .from("construction_phases")
        .select(
          "id, project, phase_number, phase_key, phase_name, status, total_tasks, completed_tasks, display_order, updated_at",
          { count: "exact" }
        )
        .eq("project", p)
        .order("display_order", { ascending: true })
        .range(offset, offset + limit - 1);
      if (status) q = q.eq("status", status);
      const { data, error, count } = await q;
      if (error) return errorResult(error.message);
      const rows = data ?? [];
      return textResult({
        project: p,
        limit,
        offset,
        count: count ?? rows.length,
        has_more: hasMore(offset, rows.length, count ?? null),
        phases: rows,
      });
    } catch (err) {
      return errorResult((err as Error).message);
    }
  }
);

// Tool: get_tasks
server.registerTool(
  "get_tasks",
  {
    title: "Get Build Tasks",
    description:
      "List construction tasks for a project with optional filters (phase_id, phase_key, status, execution_mode, assignee, overnight_only). Ordered by display_order.",
    inputSchema: {
      project: z.string().min(1).max(128).optional(),
      phase_id: z.string().uuid().optional(),
      phase_key: z.string().min(1).max(128).optional().describe("Resolved to phase_id via prefetch if phase_id not supplied"),
      status: z.enum(TASK_STATUSES).optional(),
      execution_mode: z.enum(EXECUTION_MODES).optional(),
      assignee: z.enum(ASSIGNEES).optional(),
      overnight_only: z.boolean().optional(),
      limit: z.number().int().min(1).max(200).optional().default(50),
      offset: z.number().int().min(0).optional().default(0),
    },
  },
  async ({ project, phase_id, phase_key, status, execution_mode, assignee, overnight_only, limit, offset }) => {
    try {
      const p = project ?? DEFAULT_PROJECT;

      let resolvedPhaseId = phase_id ?? null;
      if (!resolvedPhaseId && phase_key) {
        const { data: ph, error: phErr } = await supabase
          .from("construction_phases")
          .select("id")
          .eq("project", p)
          .eq("phase_key", phase_key)
          .maybeSingle();
        if (phErr) return errorResult(phErr.message);
        if (!ph) {
          return textResult({
            project: p, limit, offset, count: 0, has_more: false, tasks: [],
          });
        }
        resolvedPhaseId = ph.id as string;
      }

      let q = supabase
        .from("construction_tasks")
        .select(
          "id, project, phase_id, task_number, task_key, task_name, status, execution_mode, assignee, can_run_overnight, time_estimate, completion_session, completion_date, notes, display_order, updated_at",
          { count: "exact" }
        )
        .eq("project", p)
        .order("display_order", { ascending: true })
        .range(offset, offset + limit - 1);
      if (resolvedPhaseId) q = q.eq("phase_id", resolvedPhaseId);
      if (status) q = q.eq("status", status);
      if (execution_mode) q = q.eq("execution_mode", execution_mode);
      if (assignee) q = q.eq("assignee", assignee);
      if (overnight_only) q = q.eq("can_run_overnight", true);
      const { data, error, count } = await q;
      if (error) return errorResult(error.message);
      const rows = data ?? [];
      return textResult({
        project: p,
        limit,
        offset,
        count: count ?? rows.length,
        has_more: hasMore(offset, rows.length, count ?? null),
        tasks: rows,
      });
    } catch (err) {
      return errorResult((err as Error).message);
    }
  }
);

// Tool: get_gates
server.registerTool(
  "get_gates",
  {
    title: "Get Test Gates",
    description:
      "List test gates for a project, ordered by display_order. Set include_items=true to include the raw JSONB checklist.",
    inputSchema: {
      project: z.string().min(1).max(128).optional(),
      phase_id: z.string().uuid().optional(),
      status: z.enum(GATE_STATUSES).optional(),
      include_items: z.boolean().optional().default(false),
      limit: z.number().int().min(1).max(200).optional().default(50),
      offset: z.number().int().min(0).optional().default(0),
    },
  },
  async ({ project, phase_id, status, include_items, limit, offset }) => {
    try {
      const p = project ?? DEFAULT_PROJECT;
      const cols = include_items
        ? "id, project, phase_id, gate_key, gate_name, status, items, display_order, updated_at"
        : "id, project, phase_id, gate_key, gate_name, status, display_order, updated_at";
      let q = supabase
        .from("construction_gates")
        .select(cols, { count: "exact" })
        .eq("project", p)
        .order("display_order", { ascending: true })
        .range(offset, offset + limit - 1);
      if (phase_id) q = q.eq("phase_id", phase_id);
      if (status) q = q.eq("status", status);
      const { data, error, count } = await q;
      if (error) return errorResult(error.message);
      const rows = data ?? [];
      return textResult({
        project: p,
        limit,
        offset,
        count: count ?? rows.length,
        has_more: hasMore(offset, rows.length, count ?? null),
        gates: rows,
      });
    } catch (err) {
      return errorResult((err as Error).message);
    }
  }
);

// Tool: get_action_cards
server.registerTool(
  "get_action_cards",
  {
    title: "Get Rolling Action Cards",
    description:
      "Return the 3 active action cards (previous / current / next) for a project. Missing positions return null. Archived rows (is_active=false) are excluded.",
    inputSchema: {
      project: z.string().min(1).max(128).optional(),
      position: z.enum(CARD_POSITIONS).optional(),
    },
  },
  async ({ project, position }) => {
    try {
      const p = project ?? DEFAULT_PROJECT;
      let q = supabase
        .from("build_action_log")
        .select("id, project, position, title, description, is_active, created_at, updated_at")
        .eq("project", p)
        .eq("is_active", true)
        .eq("entry_kind", "card_snapshot");
      if (position) q = q.eq("position", position);
      const { data, error } = await q;
      if (error) return errorResult(error.message);
      const cards: Record<string, unknown> = { previous: null, current: null, next: null };
      for (const row of data ?? []) {
        cards[(row as { position: string }).position] = row;
      }
      return textResult({ project: p, cards });
    } catch (err) {
      return errorResult((err as Error).message);
    }
  }
);

// Tool: get_build_summary
server.registerTool(
  "get_build_summary",
  {
    title: "Get Build Summary",
    description:
      "High-level rollup for a project: phase/task/gate counts by status, execution mode, assignee, plus active action cards. Compares cached phase rollups against derived task counts and flags drift.",
    inputSchema: {
      project: z.string().min(1).max(128).optional(),
    },
  },
  async ({ project }) => {
    try {
      const p = project ?? DEFAULT_PROJECT;
      const [phasesRes, tasksRes, gatesRes, cardsRes] = await Promise.all([
        supabase.from("construction_phases").select("status, total_tasks, completed_tasks").eq("project", p),
        supabase.from("construction_tasks").select("status, execution_mode, assignee, can_run_overnight").eq("project", p),
        supabase.from("construction_gates").select("status").eq("project", p),
        supabase.from("build_action_log").select("position, title, description").eq("project", p).eq("is_active", true).eq("entry_kind", "card_snapshot"),
      ]);
      const firstErr = phasesRes.error ?? tasksRes.error ?? gatesRes.error ?? cardsRes.error;
      if (firstErr) return errorResult(firstErr.message);

      const phaseRows = phasesRes.data ?? [];
      const taskRows = tasksRes.data ?? [];
      const gateRows = gatesRes.data ?? [];
      const cardRows = cardsRes.data ?? [];

      const phaseByStatus: Record<string, number> = Object.fromEntries(PHASE_STATUSES.map((s) => [s, 0]));
      let cachedTotal = 0;
      let cachedDone = 0;
      for (const r of phaseRows) {
        const row = r as { status: string; total_tasks: number; completed_tasks: number };
        phaseByStatus[row.status] = (phaseByStatus[row.status] ?? 0) + 1;
        cachedTotal += row.total_tasks ?? 0;
        cachedDone += row.completed_tasks ?? 0;
      }

      const taskByStatus: Record<string, number> = Object.fromEntries(TASK_STATUSES.map((s) => [s, 0]));
      const taskByMode: Record<string, number> = Object.fromEntries(EXECUTION_MODES.map((m) => [m, 0]));
      const taskByAssignee: Record<string, number> = Object.fromEntries(ASSIGNEES.map((a) => [a, 0]));
      let overnight = 0;
      for (const r of taskRows) {
        const row = r as { status: string; execution_mode: string; assignee: string | null; can_run_overnight: boolean };
        taskByStatus[row.status] = (taskByStatus[row.status] ?? 0) + 1;
        taskByMode[row.execution_mode] = (taskByMode[row.execution_mode] ?? 0) + 1;
        const a = row.assignee ?? "unknown";
        taskByAssignee[a] = (taskByAssignee[a] ?? 0) + 1;
        if (row.can_run_overnight) overnight++;
      }
      const derivedTotal = taskRows.length;
      const derivedDone = taskByStatus["complete"] ?? 0;

      const gateByStatus: Record<string, number> = Object.fromEntries(GATE_STATUSES.map((s) => [s, 0]));
      for (const r of gateRows) {
        const row = r as { status: string };
        gateByStatus[row.status] = (gateByStatus[row.status] ?? 0) + 1;
      }

      const actionCards: Record<string, string | null> = { previous: null, current: null, next: null };
      for (const r of cardRows) {
        const row = r as { position: string; title: string };
        actionCards[row.position] = row.title;
      }

      const pct = (done: number, total: number) => (total === 0 ? null : Math.round((done / total) * 100));

      return textResult({
        project: p,
        generated_at: new Date().toISOString(),
        phases: {
          total: phaseRows.length,
          by_status: phaseByStatus,
          cached_rollup: {
            total_tasks: cachedTotal,
            completed_tasks: cachedDone,
            progress_pct: pct(cachedDone, cachedTotal),
          },
        },
        tasks: {
          total: derivedTotal,
          by_status: taskByStatus,
          by_execution_mode: taskByMode,
          by_assignee: taskByAssignee,
          overnight_candidates: overnight,
          task_rollup: {
            total_tasks: derivedTotal,
            completed_tasks: derivedDone,
            progress_pct: pct(derivedDone, derivedTotal),
          },
        },
        rollup_drift: {
          total_tasks: { cached: cachedTotal, derived: derivedTotal, drifted: cachedTotal !== derivedTotal },
          completed_tasks: { cached: cachedDone, derived: derivedDone, drifted: cachedDone !== derivedDone },
        },
        gates: {
          total: gateRows.length,
          by_status: gateByStatus,
        },
        action_cards: actionCards,
      });
    } catch (err) {
      return errorResult((err as Error).message);
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Write tools (service_role) — Memory Library Task 3
// ═══════════════════════════════════════════════════════════════════════════

// Tool: update_task_status
server.registerTool(
  "update_task_status",
  {
    title: "Update Task Status",
    description:
      "Update a construction task's status (and optionally completion_session, completion_date, notes). When status='complete' and no completion_date is passed, completion_date is auto-set to now(). Completion_date is never nulled on status change away from complete. Writes an audit row to build_action_log atomically with the state change (entry_kind='audit', target_type='task'). Optional actor param ('chat' or 'claude_code') labels the audit row; defaults to 'claude_code'.",
    inputSchema: {
      task_key: z.string().min(1).max(128),
      project: z.string().min(1).max(128).optional(),
      status: z.enum(TASK_STATUSES),
      completion_session: z.string().max(256).optional(),
      completion_date: z.string().datetime().optional(),
      notes: z.string().optional(),
      actor: z.enum(AUDIT_ACTORS).optional(),
    },
  },
  async ({ task_key, project, status, completion_session, completion_date, notes, actor }) => {
    try {
      const p = project ?? DEFAULT_PROJECT;
      const { data, error } = await supabaseWrite.rpc("rpc_update_task_status", {
        p_project: p,
        p_task_key: task_key,
        p_status: status,
        p_completion_session: completion_session ?? null,
        p_completion_date: completion_date ?? null,
        p_notes: notes ?? null,
        p_actor: actor ?? "claude_code",
      });
      if (error) return errorResult(error.message);
      const payload = data as { task: unknown } | null;
      if (!payload?.task) return errorResult(`Task not found: ${task_key} (project=${p})`);
      return textResult({ task: payload.task });
    } catch (err) {
      return errorResult((err as Error).message);
    }
  }
);

// Tool: update_phase_status
server.registerTool(
  "update_phase_status",
  {
    title: "Update Phase Status",
    description:
      "Update a construction phase's status. Always recomputes total_tasks/completed_tasks from construction_tasks and bumps updated_at on every call (drift-repair path). Audit row emitted only when status actually changes (entry_kind='audit', target_type='phase'). Optional actor param ('chat' or 'claude_code') labels the audit row; defaults to 'claude_code'.",
    inputSchema: {
      phase_key: z.string().min(1).max(128),
      project: z.string().min(1).max(128).optional(),
      status: z.enum(PHASE_STATUSES),
      actor: z.enum(AUDIT_ACTORS).optional(),
    },
  },
  async ({ phase_key, project, status, actor }) => {
    try {
      const p = project ?? DEFAULT_PROJECT;
      const { data, error } = await supabaseWrite.rpc("rpc_update_phase_status", {
        p_project: p,
        p_phase_key: phase_key,
        p_status: status,
        p_actor: actor ?? "claude_code",
      });
      if (error) return errorResult(error.message);
      const payload = data as { phase: unknown } | null;
      if (!payload?.phase) return errorResult(`Phase not found: ${phase_key} (project=${p})`);
      return textResult({ phase: payload.phase });
    } catch (err) {
      return errorResult((err as Error).message);
    }
  }
);

// Tool: update_gate_status
server.registerTool(
  "update_gate_status",
  {
    title: "Update Gate Status",
    description: "Update a test gate's status. Gates are identified by gate_key. Writes an audit row atomically when status actually changes (entry_kind='audit', target_type='gate'). Optional actor param ('chat' or 'claude_code') labels the audit row; defaults to 'claude_code'.",
    inputSchema: {
      gate_key: z.string().min(1).max(128),
      project: z.string().min(1).max(128).optional(),
      status: z.enum(GATE_STATUSES),
      actor: z.enum(AUDIT_ACTORS).optional(),
    },
  },
  async ({ gate_key, project, status, actor }) => {
    try {
      const p = project ?? DEFAULT_PROJECT;
      const { data, error } = await supabaseWrite.rpc("rpc_update_gate_status", {
        p_project: p,
        p_gate_key: gate_key,
        p_status: status,
        p_actor: actor ?? "claude_code",
      });
      if (error) return errorResult(error.message);
      const payload = data as { gate: unknown } | null;
      if (!payload?.gate) return errorResult(`Gate not found: ${gate_key} (project=${p})`);
      return textResult({ gate: payload.gate });
    } catch (err) {
      return errorResult((err as Error).message);
    }
  }
);

// Tool: update_action_cards
server.registerTool(
  "update_action_cards",
  {
    title: "Update Rolling Action Cards",
    description:
      "Write all 3 rolling action cards (previous/current/next) for a project atomically (as a triple). Archives currently-active card snapshots, then inserts 3 new active rows (entry_kind='card_snapshot'). All 3 positions are required — preserve unchanged cards by passing their existing values through. Emits one audit row per position whose title or description changed (entry_kind='audit', target_type='action_card'). Optional actor param ('chat' or 'claude_code') labels the audit rows; defaults to 'claude_code'.",
    inputSchema: {
      project: z.string().min(1).max(128).optional(),
      previous: z.object({ title: z.string().min(1), description: z.string().optional() }),
      current:  z.object({ title: z.string().min(1), description: z.string().optional() }),
      next:     z.object({ title: z.string().min(1), description: z.string().optional() }),
      actor:    z.enum(AUDIT_ACTORS).optional(),
    },
  },
  async ({ project, previous, current, next, actor }) => {
    try {
      const p = project ?? DEFAULT_PROJECT;
      const { data, error } = await supabaseWrite.rpc("rpc_update_action_cards", {
        p_project: p,
        p_cards: {
          previous: { title: previous.title, description: previous.description ?? null },
          current:  { title: current.title,  description: current.description  ?? null },
          next:     { title: next.title,     description: next.description     ?? null },
        },
        p_actor: actor ?? "claude_code",
      });
      if (error) return errorResult(error.message);
      const payload = data as { cards: Record<string, unknown> } | null;
      return textResult({ project: p, cards: payload?.cards ?? { previous: null, current: null, next: null } });
    } catch (err) {
      return errorResult((err as Error).message);
    }
  }
);

// Tool: create_open_item
server.registerTool(
  "create_open_item",
  {
    title: "Create Open Item",
    description:
      "Create a new open item (gap, legal, decision, research, grey_area, or task). Defaults: project='neon_rabbit', status='open', priority='medium'.",
    inputSchema: {
      project: z.string().min(1).max(128).optional(),
      title: z.string().min(1),
      description: z.string().optional(),
      category: z.enum(OPEN_ITEM_CATEGORIES),
      status: z.enum(OPEN_ITEM_STATUSES).optional(),
      priority: z.enum(OPEN_ITEM_PRIORITIES).optional(),
      blocking_phase: z.string().max(128).optional(),
      source_session: z.string().max(128).optional(),
      is_action_item: z.boolean().optional(),
    },
  },
  async ({ project, title, description, category, status, priority, blocking_phase, source_session, is_action_item }) => {
    try {
      const row: Record<string, unknown> = {
        project: project ?? OPEN_ITEMS_DEFAULT_PROJECT,
        title,
        category,
        status: status ?? "open",
        priority: priority ?? "medium",
        is_action_item: is_action_item ?? false,
      };
      if (description !== undefined) row.description = description;
      if (blocking_phase !== undefined) row.blocking_phase = blocking_phase;
      if (source_session !== undefined) row.source_session = source_session;
      const { data, error } = await supabaseWrite
        .from("open_items")
        .insert(row)
        .select()
        .single();
      if (error) return errorResult(error.message);
      return textResult({ item: data });
    } catch (err) {
      return errorResult((err as Error).message);
    }
  }
);

// Tool: update_open_item
server.registerTool(
  "update_open_item",
  {
    title: "Update Open Item",
    description:
      "Update fields on an open item. At least one field beyond id must be supplied.",
    inputSchema: {
      id: z.string().uuid(),
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      category: z.enum(OPEN_ITEM_CATEGORIES).optional(),
      status: z.enum(OPEN_ITEM_STATUSES).optional(),
      priority: z.enum(OPEN_ITEM_PRIORITIES).optional(),
      blocking_phase: z.string().max(128).optional(),
      source_session: z.string().max(128).optional(),
      is_action_item: z.boolean().optional(),
    },
  },
  async ({ id, title, description, category, status, priority, blocking_phase, source_session, is_action_item }) => {
    try {
      const patch: Record<string, unknown> = {};
      if (title !== undefined) patch.title = title;
      if (description !== undefined) patch.description = description;
      if (category !== undefined) patch.category = category;
      if (status !== undefined) patch.status = status;
      if (priority !== undefined) patch.priority = priority;
      if (blocking_phase !== undefined) patch.blocking_phase = blocking_phase;
      if (source_session !== undefined) patch.source_session = source_session;
      if (is_action_item !== undefined) patch.is_action_item = is_action_item;
      if (Object.keys(patch).length === 0) {
        return errorResult("No fields provided to update.");
      }
      patch.updated_at = new Date().toISOString();
      const { data, error } = await supabaseWrite
        .from("open_items")
        .update(patch)
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) return errorResult(error.message);
      if (!data) return errorResult(`Open item not found: ${id}`);
      return textResult({ item: data });
    } catch (err) {
      return errorResult((err as Error).message);
    }
  }
);

// Tool: resolve_open_item
server.registerTool(
  "resolve_open_item",
  {
    title: "Resolve Open Item",
    description:
      "Mark an open item resolved. Sets status='resolved', writes resolution text, sets resolved_at=now(). Resolution must be non-empty (whitespace rejected).",
    inputSchema: {
      id: z.string().uuid(),
      resolution: z.string().min(1),
    },
  },
  async ({ id, resolution }) => {
    try {
      if (resolution.trim().length === 0) {
        return errorResult("Resolution cannot be empty or whitespace.");
      }
      const now = new Date().toISOString();
      const { data, error } = await supabaseWrite
        .from("open_items")
        .update({
          status: "resolved",
          resolution,
          resolved_at: now,
          updated_at: now,
        })
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) return errorResult(error.message);
      if (!data) return errorResult(`Open item not found: ${id}`);
      return textResult({ item: data });
    } catch (err) {
      return errorResult((err as Error).message);
    }
  }
);

// Tool: get_open_items
server.registerTool(
  "get_open_items",
  {
    title: "Get Open Items",
    description:
      "List open items with optional filters. When status unspecified, defaults to active statuses: open, deferred, in_progress (excludes resolved).",
    inputSchema: {
      project: z.string().min(1).max(128).optional(),
      status: z.enum(OPEN_ITEM_STATUSES).optional(),
      category: z.enum(OPEN_ITEM_CATEGORIES).optional(),
      priority: z.enum(OPEN_ITEM_PRIORITIES).optional(),
      is_action_item: z.boolean().optional(),
    },
  },
  async ({ project, status, category, priority, is_action_item }) => {
    try {
      const p = project ?? OPEN_ITEMS_DEFAULT_PROJECT;
      let q = supabaseWrite
        .from("open_items")
        .select("*")
        .eq("project", p)
        .order("created_at", { ascending: false });
      if (status) {
        q = q.eq("status", status);
      } else {
        q = q.in("status", ["open", "deferred", "in_progress"]);
      }
      if (category) q = q.eq("category", category);
      if (priority) q = q.eq("priority", priority);
      if (is_action_item !== undefined) q = q.eq("is_action_item", is_action_item);
      const { data, error } = await q;
      if (error) return errorResult(error.message);
      const rows = data ?? [];
      return textResult({ project: p, count: rows.length, items: rows });
    } catch (err) {
      return errorResult((err as Error).message);
    }
  }
);

// Tool: create_client
server.registerTool(
  "create_client",
  {
    title: "Create Client",
    description:
      "Create a new client in neon_rabbit_clients. name and user_id are required (user_id is NOT NULL at DB level). Accepts only the 10 non-cron writable columns. Cron-owned columns (payment_status, stripe_customer_id, current_plan, next_charge_date, lifetime_revenue) cannot be written via MCP.",
    inputSchema: {
      name: z.string().min(1),
      user_id: z.string().uuid(),
      site_name: z.string().optional(),
      site_url: z.string().optional(),
      status: z.string().optional(),
      tier: z.string().optional(),
      mrr: z.number().nonnegative().optional(),
      started_at: z.string().optional(),
      launched_at: z.string().optional(),
      notes: z.string().optional(),
    },
  },
  async (input) => {
    try {
      const row: Record<string, unknown> = {
        name: input.name,
        user_id: input.user_id,
      };
      const optional = [
        "site_name", "site_url", "status", "tier", "mrr",
        "started_at", "launched_at", "notes",
      ] as const;
      for (const k of optional) {
        const v = (input as Record<string, unknown>)[k];
        if (v !== undefined) row[k] = v;
      }
      const { data, error } = await supabaseWrite
        .from("neon_rabbit_clients")
        .insert(row)
        .select()
        .single();
      if (error) return errorResult(error.message);
      return textResult({ client: data });
    } catch (err) {
      return errorResult((err as Error).message);
    }
  }
);

// Tool: update_client
server.registerTool(
  "update_client",
  {
    title: "Update Client",
    description:
      "Update a client row identified by id (uuid). Accepts only the 10 non-cron writable columns. No updated_at column exists on this table.",
    inputSchema: {
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      site_name: z.string().optional(),
      site_url: z.string().optional(),
      status: z.string().optional(),
      tier: z.string().optional(),
      mrr: z.number().nonnegative().optional(),
      started_at: z.string().optional(),
      launched_at: z.string().optional(),
      notes: z.string().optional(),
      user_id: z.string().uuid().optional(),
    },
  },
  async (input) => {
    try {
      const patch: Record<string, unknown> = {};
      const updatable = [
        "name", "site_name", "site_url", "status", "tier", "mrr",
        "started_at", "launched_at", "notes", "user_id",
      ] as const;
      for (const k of updatable) {
        const v = (input as Record<string, unknown>)[k];
        if (v !== undefined) patch[k] = v;
      }
      if (Object.keys(patch).length === 0) {
        return errorResult("No fields provided to update.");
      }
      const { data, error } = await supabaseWrite
        .from("neon_rabbit_clients")
        .update(patch)
        .eq("id", input.id)
        .select()
        .maybeSingle();
      if (error) return errorResult(error.message);
      if (!data) return errorResult(`Client not found: id=${input.id}`);
      return textResult({ client: data });
    } catch (err) {
      return errorResult((err as Error).message);
    }
  }
);

// Tool: get_clients
server.registerTool(
  "get_clients",
  {
    title: "Get Clients",
    description:
      "List all clients in neon_rabbit_clients. Returns full rows including cron-owned columns (payment_status, stripe_customer_id, current_plan, next_charge_date, lifetime_revenue).",
    inputSchema: {
      status: z.string().optional(),
    },
  },
  async ({ status }) => {
    try {
      let q = supabaseWrite
        .from("neon_rabbit_clients")
        .select("*")
        .order("name", { ascending: true });
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) return errorResult(error.message);
      const rows = data ?? [];
      return textResult({ count: rows.length, clients: rows });
    } catch (err) {
      return errorResult((err as Error).message);
    }
  }
);

// Tool: get_client
server.registerTool(
  "get_client",
  {
    title: "Get Client",
    description:
      "Fetch a single client by id (uuid). Returns the full row including cron-owned columns.",
    inputSchema: {
      id: z.string().uuid(),
    },
  },
  async ({ id }) => {
    try {
      const { data, error } = await supabaseWrite
        .from("neon_rabbit_clients")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) return errorResult(error.message);
      if (!data) return errorResult(`Client not found: id=${id}`);
      return textResult({ client: data });
    } catch (err) {
      return errorResult((err as Error).message);
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Audit log read — Memory Library Task 4 Part A
// ═══════════════════════════════════════════════════════════════════════════

// Tool: get_recent_audit_log
server.registerTool(
  "get_recent_audit_log",
  {
    title: "Get Recent Audit Log",
    description:
      "Return recent audit-kind rows (entry_kind='audit') from build_action_log. " +
      "Filter by project, target_type, target_key, actor. Ordered by created_at desc. " +
      "Returns exact total match count via 'count' plus the returned array length via 'page_size'. " +
      "TRUST BOUNDARY: this tool uses the service-role path and is gated only by MCP_ACCESS_KEY. " +
      "Audit payloads (old_value/new_value) are NOT exposed via anon Supabase access — " +
      "this tool is the only sanctioned read path for audit rows.",
    inputSchema: {
      project:     z.string().min(1).max(128).optional(),
      target_type: z.enum(AUDIT_TARGETS).optional(),
      target_key:  z.string().max(128).optional(),
      actor:       z.enum(AUDIT_ACTORS).optional(),
      limit:       z.number().int().min(1).max(200).optional().default(50),
    },
  },
  async ({ project, target_type, target_key, actor, limit }) => {
    try {
      const p = project ?? DEFAULT_PROJECT;
      // NOTE: service-role client. Audit rows are anon-invisible by RLS design;
      // this is the only MCP tool authorized to surface them. Gated by MCP_ACCESS_KEY.
      let q = supabaseWrite
        .from("build_action_log")
        .select(
          "id, project, entry_kind, target_type, target_key, actor, old_value, new_value, summary, created_at",
          { count: "exact" }
        )
        .eq("project", p)
        .eq("entry_kind", "audit")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (target_type) q = q.eq("target_type", target_type);
      if (target_key)  q = q.eq("target_key",  target_key);
      if (actor)       q = q.eq("actor",       actor);
      const { data, error, count } = await q;
      if (error) return errorResult(error.message);
      const rows = data ?? [];
      return textResult({ project: p, count: count ?? 0, page_size: rows.length, rows });
    } catch (err) {
      return errorResult((err as Error).message);
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════
// VAC (VA Compensation) — 20 tools: 4 readers + 16 writers. All writers
// delegate to fn_* RPCs in migration 021 (SECURITY INVOKER, service_role
// only). Readers query vac_* tables directly via service_role — dashboard
// reads come through PostgREST with authenticated role, not this path.
// ═══════════════════════════════════════════════════════════════════════

const VAC_PIPELINE_STAGES = [
  "discovery","intake","extraction","analysis","strategy",
  "filed","decision_pending","granted","denied","appeal","deferred",
] as const;
const VAC_TIERS = [1,2,3,4,5] as const;
const VAC_CLAIM_TYPES = [
  "original","supplemental","hlr","bva","secondary","presumptive",
] as const;
const VAC_SOURCE_BUCKETS = [
  "va_clinical","decision_letters","nexus","mayo",
  "lay_statements","va_correspondence","service_records",
] as const;
const VAC_SOURCE_STAGES = ["intake","extraction","analysis","complete","skipped"] as const;
const VAC_LINK_TYPES = ["causation","evidence","dependency","presumptive"] as const;
const VAC_LINK_RELEVANCE = ["primary","supporting","contextual"] as const;
const VAC_PHASES = ["records_scrub","records_expansion","deep_research"] as const;
const VAC_ACTIVITY_ENTRY_TYPES = [
  "condition_created","condition_updated","condition_stage_changed",
  "condition_rating_changed","condition_deadline_changed",
  "condition_archived","condition_restored",
  "source_added","source_updated","source_processed",
  "source_linked_to_condition","source_unlinked",
  "interlink_added","interlink_removed",
  "phase_changed","phase_progress_updated",
  "filing_made","decision_received","note",
] as const;
const VAC_ACTIVITY_SUBJECT_TYPES = ["condition","source","interlink","phase"] as const;
const VAC_KEY_DATE_TYPES = ["appointment","deadline","follow_up","filing","records_request"] as const;
const VAC_KEY_DATE_STATUSES = ["upcoming","completed","cancelled","missed"] as const;

// ── Readers ────────────────────────────────────────────────────────────

server.registerTool(
  "get_vac_conditions",
  {
    title: "Get VAC Conditions",
    description: "List VAC conditions with optional filters. Excludes archived by default.",
    inputSchema: {
      tier: z.enum(VAC_TIERS.map(String) as unknown as [string, ...string[]]).optional(),
      pipeline_stage: z.enum(VAC_PIPELINE_STAGES).optional(),
      include_archived: z.boolean().default(false),
      limit: z.number().int().min(1).max(200).default(100),
      offset: z.number().int().min(0).default(0),
    },
  },
  async ({ tier, pipeline_stage, include_archived, limit, offset }) => {
    try {
      let q = supabaseWrite
        .from("vac_conditions")
        .select("*", { count: "exact" })
        .order("tier", { ascending: true })
        .order("name", { ascending: true })
        .range(offset, offset + limit - 1);
      if (!include_archived) q = q.is("archived_at", null);
      if (tier) q = q.eq("tier", Number(tier));
      if (pipeline_stage) q = q.eq("pipeline_stage", pipeline_stage);
      const { data, error, count } = await q;
      if (error) return errorResult(error.message);
      const rows = data ?? [];
      return textResult({
        count: count ?? rows.length,
        page_size: rows.length,
        limit, offset,
        has_more: hasMore(offset, rows.length, count ?? null),
        conditions: rows,
      });
    } catch (err) {
      return errorResult((err as Error).message);
    }
  }
);

server.registerTool(
  "get_vac_sources",
  {
    title: "Get VAC Sources",
    description: "List VAC source records. Excludes archived by default.",
    inputSchema: {
      bucket: z.enum(VAC_SOURCE_BUCKETS).optional(),
      processing_stage: z.enum(VAC_SOURCE_STAGES).optional(),
      include_archived: z.boolean().default(false),
      limit: z.number().int().min(1).max(200).default(100),
      offset: z.number().int().min(0).default(0),
    },
  },
  async ({ bucket, processing_stage, include_archived, limit, offset }) => {
    try {
      let q = supabaseWrite
        .from("vac_sources")
        .select("*", { count: "exact" })
        .order("date_of_record", { ascending: false, nullsFirst: false })
        .range(offset, offset + limit - 1);
      if (!include_archived) q = q.is("archived_at", null);
      if (bucket) q = q.eq("bucket", bucket);
      if (processing_stage) q = q.eq("processing_stage", processing_stage);
      const { data, error, count } = await q;
      if (error) return errorResult(error.message);
      const rows = data ?? [];
      return textResult({
        count: count ?? rows.length,
        page_size: rows.length,
        limit, offset,
        has_more: hasMore(offset, rows.length, count ?? null),
        sources: rows,
      });
    } catch (err) {
      return errorResult((err as Error).message);
    }
  }
);

server.registerTool(
  "get_vac_interlinks",
  {
    title: "Get VAC Interlinks",
    description: "List VAC condition interlinks. Optional filter by condition id.",
    inputSchema: {
      condition_id: z.string().uuid().optional(),
      link_type: z.enum(VAC_LINK_TYPES).optional(),
      limit: z.number().int().min(1).max(500).default(200),
      offset: z.number().int().min(0).default(0),
    },
  },
  async ({ condition_id, link_type, limit, offset }) => {
    try {
      let q = supabaseWrite
        .from("vac_interlinks")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);
      if (condition_id) {
        q = q.or(`condition_a_id.eq.${condition_id},condition_b_id.eq.${condition_id}`);
      }
      if (link_type) q = q.eq("link_type", link_type);
      const { data, error, count } = await q;
      if (error) return errorResult(error.message);
      const rows = data ?? [];
      return textResult({
        count: count ?? rows.length,
        page_size: rows.length,
        limit, offset,
        has_more: hasMore(offset, rows.length, count ?? null),
        interlinks: rows,
      });
    } catch (err) {
      return errorResult((err as Error).message);
    }
  }
);

server.registerTool(
  "get_vac_activity_log",
  {
    title: "Get VAC Activity Log",
    description: "Recent VAC activity entries, most recent first.",
    inputSchema: {
      subject_type: z.enum(VAC_ACTIVITY_SUBJECT_TYPES).optional(),
      subject_id: z.string().uuid().optional(),
      entry_type: z.enum(VAC_ACTIVITY_ENTRY_TYPES).optional(),
      limit: z.number().int().min(1).max(500).default(50),
      offset: z.number().int().min(0).default(0),
    },
  },
  async ({ subject_type, subject_id, entry_type, limit, offset }) => {
    try {
      let q = supabaseWrite
        .from("vac_activity_log")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);
      if (subject_type) q = q.eq("subject_type", subject_type);
      if (subject_id) q = q.eq("subject_id", subject_id);
      if (entry_type) q = q.eq("entry_type", entry_type);
      const { data, error, count } = await q;
      if (error) return errorResult(error.message);
      const rows = data ?? [];
      return textResult({
        count: count ?? rows.length,
        page_size: rows.length,
        limit, offset,
        has_more: hasMore(offset, rows.length, count ?? null),
        entries: rows,
      });
    } catch (err) {
      return errorResult((err as Error).message);
    }
  }
);

// ── Writers (delegate to fn_* RPCs) ────────────────────────────────────

server.registerTool(
  "create_vac_condition",
  {
    title: "Create VAC Condition",
    description: "Create a new VA claim condition. Slug is normalized (lowercase/trimmed) and globally unique.",
    inputSchema: {
      slug: z.string().min(1).max(128),
      name: z.string().min(1).max(256),
      tier: z.number().int().min(1).max(5),
      icd_code: z.string().max(32).optional(),
      claim_type: z.enum(VAC_CLAIM_TYPES).optional(),
      evidence_score: z.number().int().min(0).max(100).optional(),
      current_rating_pct: z.number().int().min(0).max(100).refine((v) => v % 10 === 0, "must be multiple of 10").optional(),
      deadline: z.string().optional(),
      causation_root: z.string().optional(),
      notes: z.string().optional(),
      actor: z.enum(AUDIT_ACTORS).default("chat"),
    },
  },
  async (a) => {
    try {
      const { data, error } = await supabaseWrite.rpc("fn_create_vac_condition", {
        p_slug: a.slug,
        p_name: a.name,
        p_tier: a.tier,
        p_icd_code: a.icd_code ?? null,
        p_claim_type: a.claim_type ?? null,
        p_evidence_score: a.evidence_score ?? null,
        p_current_rating_pct: a.current_rating_pct ?? null,
        p_deadline: a.deadline ?? null,
        p_causation_root: a.causation_root ?? null,
        p_notes: a.notes ?? null,
        p_actor: a.actor,
      });
      if (error) return errorResult(error.message);
      return textResult({ condition: data });
    } catch (err) { return errorResult((err as Error).message); }
  }
);

server.registerTool(
  "update_vac_condition",
  {
    title: "Update VAC Condition",
    description: "Update metadata on a non-archived condition (identified by id or slug). Cannot change stage/rating/deadline/archived_at here — use dedicated tools.",
    inputSchema: {
      id_or_slug: z.string().min(1).max(128),
      name: z.string().min(1).max(256).optional(),
      icd_code: z.string().max(32).optional(),
      claim_type: z.enum(VAC_CLAIM_TYPES).optional(),
      evidence_score: z.number().int().min(0).max(100).optional(),
      causation_root: z.string().optional(),
      notes: z.string().optional(),
      actor: z.enum(AUDIT_ACTORS).default("chat"),
    },
  },
  async (a) => {
    try {
      const { data, error } = await supabaseWrite.rpc("fn_update_vac_condition", {
        p_id_or_slug: a.id_or_slug,
        p_name: a.name ?? null,
        p_icd_code: a.icd_code ?? null,
        p_claim_type: a.claim_type ?? null,
        p_evidence_score: a.evidence_score ?? null,
        p_causation_root: a.causation_root ?? null,
        p_notes: a.notes ?? null,
        p_actor: a.actor,
      });
      if (error) return errorResult(error.message);
      return textResult({ condition: data });
    } catch (err) { return errorResult((err as Error).message); }
  }
);

server.registerTool(
  "set_vac_condition_stage",
  {
    title: "Set VAC Condition Stage",
    description: "Change pipeline_stage on a non-archived condition. Logs stage transition.",
    inputSchema: {
      id_or_slug: z.string().min(1).max(128),
      new_stage: z.enum(VAC_PIPELINE_STAGES),
      reason: z.string().optional(),
      actor: z.enum(AUDIT_ACTORS).default("chat"),
    },
  },
  async (a) => {
    try {
      const { data, error } = await supabaseWrite.rpc("fn_set_vac_condition_stage", {
        p_id_or_slug: a.id_or_slug,
        p_new_stage: a.new_stage,
        p_reason: a.reason ?? null,
        p_actor: a.actor,
      });
      if (error) return errorResult(error.message);
      return textResult({ condition: data });
    } catch (err) { return errorResult((err as Error).message); }
  }
);

server.registerTool(
  "set_vac_condition_rating",
  {
    title: "Set VAC Condition Rating",
    description: "Update current_rating_pct (multiple of 10, 0-100). Cannot change rating on archived.",
    inputSchema: {
      id_or_slug: z.string().min(1).max(128),
      new_rating_pct: z.number().int().min(0).max(100).refine((v) => v % 10 === 0, "must be multiple of 10"),
      actor: z.enum(AUDIT_ACTORS).default("chat"),
    },
  },
  async (a) => {
    try {
      const { data, error } = await supabaseWrite.rpc("fn_set_vac_condition_rating", {
        p_id_or_slug: a.id_or_slug,
        p_new_rating_pct: a.new_rating_pct,
        p_actor: a.actor,
      });
      if (error) return errorResult(error.message);
      return textResult({ condition: data });
    } catch (err) { return errorResult((err as Error).message); }
  }
);

server.registerTool(
  "set_vac_condition_deadline",
  {
    title: "Set VAC Condition Deadline",
    description: "Update deadline DATE on a non-archived condition. Pass null via omitting to clear.",
    inputSchema: {
      id_or_slug: z.string().min(1).max(128),
      new_deadline: z.string().nullable().optional(),
      actor: z.enum(AUDIT_ACTORS).default("chat"),
    },
  },
  async (a) => {
    try {
      const { data, error } = await supabaseWrite.rpc("fn_set_vac_condition_deadline", {
        p_id_or_slug: a.id_or_slug,
        p_new_deadline: a.new_deadline ?? null,
        p_actor: a.actor,
      });
      if (error) return errorResult(error.message);
      return textResult({ condition: data });
    } catch (err) { return errorResult((err as Error).message); }
  }
);

server.registerTool(
  "archive_vac_condition",
  {
    title: "Archive VAC Condition",
    description: "Soft-delete a condition (sets archived_at). Fails if already archived. Slug stays reserved for restore.",
    inputSchema: {
      id_or_slug: z.string().min(1).max(128),
      actor: z.enum(AUDIT_ACTORS).default("chat"),
    },
  },
  async (a) => {
    try {
      const { data, error } = await supabaseWrite.rpc("fn_archive_vac_condition", {
        p_id_or_slug: a.id_or_slug, p_actor: a.actor,
      });
      if (error) return errorResult(error.message);
      return textResult({ condition: data });
    } catch (err) { return errorResult((err as Error).message); }
  }
);

server.registerTool(
  "restore_vac_condition",
  {
    title: "Restore VAC Condition",
    description: "Clear archived_at on a soft-deleted condition. Fails if not archived.",
    inputSchema: {
      id_or_slug: z.string().min(1).max(128),
      actor: z.enum(AUDIT_ACTORS).default("chat"),
    },
  },
  async (a) => {
    try {
      const { data, error } = await supabaseWrite.rpc("fn_restore_vac_condition", {
        p_id_or_slug: a.id_or_slug, p_actor: a.actor,
      });
      if (error) return errorResult(error.message);
      return textResult({ condition: data });
    } catch (err) { return errorResult((err as Error).message); }
  }
);

server.registerTool(
  "create_vac_source",
  {
    title: "Create VAC Source",
    description: "Register a new source record in one of 7 buckets.",
    inputSchema: {
      title: z.string().min(1).max(256),
      bucket: z.enum(VAC_SOURCE_BUCKETS),
      physical_location: z.string().optional(),
      external_ref: z.string().optional(),
      checksum: z.string().optional(),
      date_of_record: z.string().optional(),
      processing_stage: z.enum(VAC_SOURCE_STAGES).default("intake"),
      summary: z.string().optional(),
      actor: z.enum(AUDIT_ACTORS).default("chat"),
    },
  },
  async (a) => {
    try {
      const { data, error } = await supabaseWrite.rpc("fn_create_vac_source", {
        p_title: a.title,
        p_bucket: a.bucket,
        p_physical_location: a.physical_location ?? null,
        p_external_ref: a.external_ref ?? null,
        p_checksum: a.checksum ?? null,
        p_date_of_record: a.date_of_record ?? null,
        p_processing_stage: a.processing_stage,
        p_summary: a.summary ?? null,
        p_actor: a.actor,
      });
      if (error) return errorResult(error.message);
      return textResult({ source: data });
    } catch (err) { return errorResult((err as Error).message); }
  }
);

server.registerTool(
  "update_vac_source",
  {
    title: "Update VAC Source",
    description: "Update metadata on a non-archived source record (by id).",
    inputSchema: {
      id: z.string().uuid(),
      title: z.string().min(1).max(256).optional(),
      bucket: z.enum(VAC_SOURCE_BUCKETS).optional(),
      physical_location: z.string().optional(),
      external_ref: z.string().optional(),
      checksum: z.string().optional(),
      date_of_record: z.string().optional(),
      summary: z.string().optional(),
      actor: z.enum(AUDIT_ACTORS).default("chat"),
    },
  },
  async (a) => {
    try {
      const { data, error } = await supabaseWrite.rpc("fn_update_vac_source", {
        p_id: a.id,
        p_title: a.title ?? null,
        p_bucket: a.bucket ?? null,
        p_physical_location: a.physical_location ?? null,
        p_external_ref: a.external_ref ?? null,
        p_checksum: a.checksum ?? null,
        p_date_of_record: a.date_of_record ?? null,
        p_summary: a.summary ?? null,
        p_actor: a.actor,
      });
      if (error) return errorResult(error.message);
      return textResult({ source: data });
    } catch (err) { return errorResult((err as Error).message); }
  }
);

server.registerTool(
  "set_source_processing_stage",
  {
    title: "Set Source Processing Stage",
    description: "Move a source through the 5-stage processing pipeline. 'complete' logs as 'source_processed'.",
    inputSchema: {
      id: z.string().uuid(),
      new_stage: z.enum(VAC_SOURCE_STAGES),
      actor: z.enum(AUDIT_ACTORS).default("chat"),
    },
  },
  async (a) => {
    try {
      const { data, error } = await supabaseWrite.rpc("fn_set_source_processing_stage", {
        p_id: a.id, p_new_stage: a.new_stage, p_actor: a.actor,
      });
      if (error) return errorResult(error.message);
      return textResult({ source: data });
    } catch (err) { return errorResult((err as Error).message); }
  }
);

server.registerTool(
  "link_source_to_condition",
  {
    title: "Link Source to Condition",
    description: "Associate a source record with a condition. Upserts on (source_id, condition_id).",
    inputSchema: {
      source_id: z.string().uuid(),
      condition_id_or_slug: z.string().min(1).max(128),
      relevance: z.enum(VAC_LINK_RELEVANCE).optional(),
      notes: z.string().optional(),
      actor: z.enum(AUDIT_ACTORS).default("chat"),
    },
  },
  async (a) => {
    try {
      const { data, error } = await supabaseWrite.rpc("fn_link_source_to_condition", {
        p_source_id: a.source_id,
        p_condition_id_or_slug: a.condition_id_or_slug,
        p_relevance: a.relevance ?? null,
        p_notes: a.notes ?? null,
        p_actor: a.actor,
      });
      if (error) return errorResult(error.message);
      return textResult({ link: data });
    } catch (err) { return errorResult((err as Error).message); }
  }
);

server.registerTool(
  "unlink_source_from_condition",
  {
    title: "Unlink Source from Condition",
    description: "Remove a source↔condition link.",
    inputSchema: {
      source_id: z.string().uuid(),
      condition_id_or_slug: z.string().min(1).max(128),
      actor: z.enum(AUDIT_ACTORS).default("chat"),
    },
  },
  async (a) => {
    try {
      const { data, error } = await supabaseWrite.rpc("fn_unlink_source_from_condition", {
        p_source_id: a.source_id,
        p_condition_id_or_slug: a.condition_id_or_slug,
        p_actor: a.actor,
      });
      if (error) return errorResult(error.message);
      return textResult({ result: data });
    } catch (err) { return errorResult((err as Error).message); }
  }
);

server.registerTool(
  "create_vac_interlink",
  {
    title: "Create VAC Interlink",
    description: "Link two conditions. causation/dependency are directional (A→B ≠ B→A); evidence/presumptive are undirected.",
    inputSchema: {
      condition_a_id_or_slug: z.string().min(1).max(128),
      condition_b_id_or_slug: z.string().min(1).max(128),
      link_type: z.enum(VAC_LINK_TYPES),
      reason: z.string().optional(),
      source_id: z.string().uuid().optional(),
      actor: z.enum(AUDIT_ACTORS).default("chat"),
    },
  },
  async (a) => {
    try {
      const { data, error } = await supabaseWrite.rpc("fn_create_vac_interlink", {
        p_condition_a_id_or_slug: a.condition_a_id_or_slug,
        p_condition_b_id_or_slug: a.condition_b_id_or_slug,
        p_link_type: a.link_type,
        p_reason: a.reason ?? null,
        p_source_id: a.source_id ?? null,
        p_actor: a.actor,
      });
      if (error) return errorResult(error.message);
      return textResult({ interlink: data });
    } catch (err) { return errorResult((err as Error).message); }
  }
);

server.registerTool(
  "remove_vac_interlink",
  {
    title: "Remove VAC Interlink",
    description: "Delete an interlink by id.",
    inputSchema: {
      interlink_id: z.string().uuid(),
      actor: z.enum(AUDIT_ACTORS).default("chat"),
    },
  },
  async (a) => {
    try {
      const { data, error } = await supabaseWrite.rpc("fn_remove_vac_interlink", {
        p_interlink_id: a.interlink_id, p_actor: a.actor,
      });
      if (error) return errorResult(error.message);
      return textResult({ interlink: data });
    } catch (err) { return errorResult((err as Error).message); }
  }
);

server.registerTool(
  "log_vac_activity",
  {
    title: "Log VAC Activity",
    description: "Append a free-form activity entry. entry_type must match the CHECK constraint.",
    inputSchema: {
      entry_type: z.enum(VAC_ACTIVITY_ENTRY_TYPES),
      description: z.string().min(1),
      subject_type: z.enum(VAC_ACTIVITY_SUBJECT_TYPES).optional(),
      subject_id: z.string().uuid().optional(),
      actor: z.enum(AUDIT_ACTORS).default("chat"),
    },
  },
  async (a) => {
    try {
      const { data, error } = await supabaseWrite.rpc("fn_log_vac_activity", {
        p_entry_type: a.entry_type,
        p_description: a.description,
        p_subject_type: a.subject_type ?? null,
        p_subject_id: a.subject_id ?? null,
        p_actor: a.actor,
      });
      if (error) return errorResult(error.message);
      return textResult({ entry: data });
    } catch (err) { return errorResult((err as Error).message); }
  }
);

// ── VAC Key Dates ──────────────────────────────────────────────────────

server.registerTool(
  "get_vac_key_dates",
  {
    title: "Get VAC Key Dates",
    description: "List VAC key dates (appointments, deadlines, follow-ups, filings, records requests). Sorted by date ascending. Past dates excluded unless include_past=true.",
    inputSchema: {
      status: z.enum(VAC_KEY_DATE_STATUSES).optional(),
      date_type: z.enum(VAC_KEY_DATE_TYPES).optional(),
      include_past: z.boolean().default(false),
      limit: z.number().int().min(1).max(200).default(20),
    },
  },
  async ({ status, date_type, include_past, limit }) => {
    try {
      let q = supabaseWrite
        .from("vac_key_dates")
        .select("*")
        .order("date_value", { ascending: true })
        .limit(limit);
      if (status) q = q.eq("status", status);
      if (date_type) q = q.eq("date_type", date_type);
      if (!include_past) {
        const today = new Date().toISOString().slice(0, 10);
        q = q.gte("date_value", today);
      }
      const { data, error } = await q;
      if (error) return errorResult(error.message);
      return textResult({ key_dates: data ?? [] });
    } catch (err) { return errorResult((err as Error).message); }
  }
);

server.registerTool(
  "create_vac_key_date",
  {
    title: "Create VAC Key Date",
    description: "Create a new VAC key date (appointment, deadline, follow-up, filing, or records request). Optionally linked to a condition.",
    inputSchema: {
      title: z.string().min(1).max(256),
      date_value: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD"),
      date_type: z.enum(VAC_KEY_DATE_TYPES),
      provider: z.string().max(128).optional(),
      condition_id: z.string().uuid().optional(),
      description: z.string().max(2000).optional(),
      actor: z.enum(AUDIT_ACTORS).default("chat"),
    },
  },
  async (a) => {
    try {
      const { data, error } = await supabaseWrite.rpc("fn_create_vac_key_date", {
        p_title: a.title,
        p_date_value: a.date_value,
        p_date_type: a.date_type,
        p_provider: a.provider ?? null,
        p_condition_id: a.condition_id ?? null,
        p_description: a.description ?? null,
        p_actor: a.actor,
      });
      if (error) return errorResult(error.message);
      return textResult({ key_date: data });
    } catch (err) { return errorResult((err as Error).message); }
  }
);

server.registerTool(
  "update_vac_key_date",
  {
    title: "Update VAC Key Date",
    description: "Update any field on a key date including status. Use status='cancelled' rather than deleting.",
    inputSchema: {
      id: z.string().uuid(),
      title: z.string().min(1).max(256).optional(),
      date_value: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD").optional(),
      date_type: z.enum(VAC_KEY_DATE_TYPES).optional(),
      provider: z.string().max(128).optional(),
      condition_id: z.string().uuid().optional(),
      description: z.string().max(2000).optional(),
      status: z.enum(VAC_KEY_DATE_STATUSES).optional(),
      actor: z.enum(AUDIT_ACTORS).default("chat"),
    },
  },
  async (a) => {
    try {
      const { data, error } = await supabaseWrite.rpc("fn_update_vac_key_date", {
        p_id: a.id,
        p_title: a.title ?? null,
        p_date_value: a.date_value ?? null,
        p_date_type: a.date_type ?? null,
        p_provider: a.provider ?? null,
        p_condition_id: a.condition_id ?? null,
        p_description: a.description ?? null,
        p_status: a.status ?? null,
        p_actor: a.actor,
      });
      if (error) return errorResult(error.message);
      return textResult({ key_date: data });
    } catch (err) { return errorResult((err as Error).message); }
  }
);

server.registerTool(
  "update_vac_phase_state",
  {
    title: "Update VAC Phase State",
    description: "Update the singleton phase tracker with optimistic concurrency. Pass the current version; conflict if stale.",
    inputSchema: {
      expected_version: z.number().int().min(1),
      current_phase: z.enum(VAC_PHASES).optional(),
      progress_count: z.number().int().min(0).optional(),
      progress_total: z.number().int().min(0).optional(),
      notes: z.string().optional(),
      actor: z.enum(AUDIT_ACTORS).default("chat"),
    },
  },
  async (a) => {
    try {
      const { data, error } = await supabaseWrite.rpc("fn_update_vac_phase_state", {
        p_expected_version: a.expected_version,
        p_current_phase: a.current_phase ?? null,
        p_progress_count: a.progress_count ?? null,
        p_progress_total: a.progress_total ?? null,
        p_notes: a.notes ?? null,
        p_actor: a.actor,
      });
      if (error) return errorResult(error.message);
      return textResult({ phase_state: data });
    } catch (err) { return errorResult((err as Error).message); }
  }
);

// --- Hono App with Auth + CORS (mirrors open-brain-mcp) ---

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-brain-key, accept, mcp-session-id",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
};

const app = new Hono();

app.options("*", (c) => c.text("ok", 200, corsHeaders));

app.all("*", async (c) => {
  const provided =
    c.req.header("x-brain-key") || new URL(c.req.url).searchParams.get("key");
  if (!provided || provided !== MCP_ACCESS_KEY) {
    return c.json({ error: "Invalid or missing access key" }, 401, corsHeaders);
  }

  // StreamableHTTPTransport requires Accept: text/event-stream.
  // Claude Desktop / claude.ai connectors don't always send it — patch the raw request.
  if (!c.req.header("accept")?.includes("text/event-stream")) {
    const headers = new Headers(c.req.raw.headers);
    headers.set("Accept", "application/json, text/event-stream");
    const patched = new Request(c.req.raw.url, {
      method: c.req.raw.method,
      headers,
      body: c.req.raw.body,
      // @ts-ignore -- duplex required for streaming body in Deno
      duplex: "half",
    });
    Object.defineProperty(c.req, "raw", { value: patched, writable: true });
  }

  const transport = new StreamableHTTPTransport();
  await server.connect(transport);
  return transport.handleRequest(c);
});

Deno.serve(app.fetch);
