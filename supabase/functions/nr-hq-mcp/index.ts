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
        .eq("is_active", true);
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
        supabase.from("build_action_log").select("position, title, description").eq("project", p).eq("is_active", true),
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
      "Update a construction task's status (and optionally completion_session, completion_date, notes). When status='complete' and no completion_date is passed, completion_date is auto-set to now(). Completion_date is never nulled on status change away from complete.",
    inputSchema: {
      task_key: z.string().min(1).max(128),
      project: z.string().min(1).max(128).optional(),
      status: z.enum(TASK_STATUSES),
      completion_session: z.string().max(256).optional(),
      completion_date: z.string().datetime().optional(),
      notes: z.string().optional(),
    },
  },
  async ({ task_key, project, status, completion_session, completion_date, notes }) => {
    try {
      const p = project ?? DEFAULT_PROJECT;
      const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
      if (completion_session !== undefined) patch.completion_session = completion_session;
      if (notes !== undefined) patch.notes = notes;
      if (completion_date !== undefined) {
        patch.completion_date = completion_date;
      } else if (status === "complete") {
        patch.completion_date = new Date().toISOString();
      }
      const { data, error } = await supabaseWrite
        .from("construction_tasks")
        .update(patch)
        .eq("project", p)
        .eq("task_key", task_key)
        .select()
        .maybeSingle();
      if (error) return errorResult(error.message);
      if (!data) return errorResult(`Task not found: ${task_key} (project=${p})`);
      return textResult({ task: data });
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
      "Update a construction phase's status. Recomputes total_tasks and completed_tasks from construction_tasks rows after the status write.",
    inputSchema: {
      phase_key: z.string().min(1).max(128),
      project: z.string().min(1).max(128).optional(),
      status: z.enum(PHASE_STATUSES),
    },
  },
  async ({ phase_key, project, status }) => {
    try {
      const p = project ?? DEFAULT_PROJECT;
      const now = new Date().toISOString();

      // 1. Update status, get phase id
      const { data: statusRow, error: statusErr } = await supabaseWrite
        .from("construction_phases")
        .update({ status, updated_at: now })
        .eq("project", p)
        .eq("phase_key", phase_key)
        .select("id")
        .maybeSingle();
      if (statusErr) return errorResult(statusErr.message);
      if (!statusRow) return errorResult(`Phase not found: ${phase_key} (project=${p})`);
      const phaseId = statusRow.id as string;

      // 2. Recompute counts
      const totalRes = await supabaseWrite
        .from("construction_tasks")
        .select("id", { count: "exact", head: true })
        .eq("phase_id", phaseId);
      if (totalRes.error) return errorResult(totalRes.error.message);
      const doneRes = await supabaseWrite
        .from("construction_tasks")
        .select("id", { count: "exact", head: true })
        .eq("phase_id", phaseId)
        .eq("status", "complete");
      if (doneRes.error) return errorResult(doneRes.error.message);

      // 3. Write counts back and return full row
      const { data: finalRow, error: finalErr } = await supabaseWrite
        .from("construction_phases")
        .update({
          total_tasks: totalRes.count ?? 0,
          completed_tasks: doneRes.count ?? 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", phaseId)
        .select()
        .single();
      if (finalErr) return errorResult(finalErr.message);
      return textResult({ phase: finalRow });
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
    description: "Update a test gate's status. Gates are identified by gate_key.",
    inputSchema: {
      gate_key: z.string().min(1).max(128),
      project: z.string().min(1).max(128).optional(),
      status: z.enum(GATE_STATUSES),
    },
  },
  async ({ gate_key, project, status }) => {
    try {
      const p = project ?? DEFAULT_PROJECT;
      const { data, error } = await supabaseWrite
        .from("construction_gates")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("project", p)
        .eq("gate_key", gate_key)
        .select()
        .maybeSingle();
      if (error) return errorResult(error.message);
      if (!data) return errorResult(`Gate not found: ${gate_key} (project=${p})`);
      return textResult({ gate: data });
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
      "Write all 3 rolling action cards (previous/current/next) for a project atomically (as a triple). Archives any currently-active cards (is_active=false), then inserts 3 new active rows. All 3 positions are required — preserve unchanged cards by passing their existing values through.",
    inputSchema: {
      project: z.string().min(1).max(128).optional(),
      previous: z.object({ title: z.string().min(1), description: z.string().optional() }),
      current:  z.object({ title: z.string().min(1), description: z.string().optional() }),
      next:     z.object({ title: z.string().min(1), description: z.string().optional() }),
    },
  },
  async ({ project, previous, current, next }) => {
    try {
      const p = project ?? DEFAULT_PROJECT;
      const now = new Date().toISOString();

      // Archive old
      const archiveRes = await supabaseWrite
        .from("build_action_log")
        .update({ is_active: false, updated_at: now })
        .eq("project", p)
        .eq("is_active", true);
      if (archiveRes.error) return errorResult(archiveRes.error.message);

      // Insert 3 new
      const { data, error } = await supabaseWrite
        .from("build_action_log")
        .insert([
          { project: p, position: "previous", title: previous.title, description: previous.description ?? null, is_active: true },
          { project: p, position: "current",  title: current.title,  description: current.description ?? null,  is_active: true },
          { project: p, position: "next",     title: next.title,     description: next.description ?? null,     is_active: true },
        ])
        .select();
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
    },
  },
  async ({ project, title, description, category, status, priority, blocking_phase, source_session }) => {
    try {
      const row: Record<string, unknown> = {
        project: project ?? OPEN_ITEMS_DEFAULT_PROJECT,
        title,
        category,
        status: status ?? "open",
        priority: priority ?? "medium",
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
    },
  },
  async ({ id, title, description, category, status, priority, blocking_phase, source_session }) => {
    try {
      const patch: Record<string, unknown> = {};
      if (title !== undefined) patch.title = title;
      if (description !== undefined) patch.description = description;
      if (category !== undefined) patch.category = category;
      if (status !== undefined) patch.status = status;
      if (priority !== undefined) patch.priority = priority;
      if (blocking_phase !== undefined) patch.blocking_phase = blocking_phase;
      if (source_session !== undefined) patch.source_session = source_session;
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
    },
  },
  async ({ project, status, category, priority }) => {
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
