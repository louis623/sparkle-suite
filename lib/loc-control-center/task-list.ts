import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import {
  BUG_HUNT_PRIORITIES,
  BUG_HUNT_SELECT,
  normalizeBugHuntItem,
} from "@/lib/control-center/bug-hunt";
import { LocBridgeError } from "./security";

type Admin = ReturnType<typeof createAdminClient>;

/** Filter before paging; the legacy open backlog orders urgency before recency. */
export async function readLocTaskList(
  admin: Admin,
  input: Record<string, unknown>,
  { limit, offset }: { limit: number; offset: number },
) {
  let since: string | undefined;
  if (input.updatedSince) {
    const date = new Date(String(input.updatedSince));
    if (!Number.isFinite(date.getTime()))
      throw new LocBridgeError(400, "Choose a valid updated date.");
    since = date.toISOString();
  }
  const term = String(input.query ?? "").trim().slice(0, 240);
  // Literal case-insensitive substring search, including '*', which ILIKE aliases to '%'.
  // Escape regex syntax, then quote the complete PostgREST value.
  const pattern = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const quotedPattern = '"' + pattern.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  const priorities = BUG_HUNT_PRIORITIES.filter(
    (priority) => !input.priority || input.priority === priority,
  );
  const filtered = (priority: string, count = false) => {
    let query = admin
      .from("sparkle_suite_bug_hunt_items")
      .select(BUG_HUNT_SELECT, count ? { count: "exact", head: true } : {})
      .eq("priority", priority);
    if (input.status) query = query.eq("status", String(input.status));
    if (input.excludeComplete === true) query = query.neq("status", "complete");
    if (since) query = query.gte("updated_at", since);
    if (term)
      query = query.or(
        ["title", "details", "owner", "item_type", "status", "priority"]
          .map((field) => `${field}.imatch.${quotedPattern}`)
          .join(","),
      );
    return query;
  };
  // Four bounded count requests avoid loading the entire backlog to sort it.
  const counts = await Promise.all(priorities.map(async (priority) => {
    const { count, error } = await filtered(priority, true);
    if (error) throw error;
    if (count === null) throw new Error("Task count was unavailable.");
    return { priority, count };
  }));
  let groupStart = 0;
  const ranges = counts.flatMap(({ priority, count }) => {
    const start = Math.max(0, offset - groupStart);
    const end = Math.min(count - 1, offset + limit - groupStart);
    groupStart += count;
    return start <= end ? [{ priority, start, end }] : [];
  });
  const pages = await Promise.all(ranges.map(async ({ priority, start, end }) => {
    const { data, error } = await filtered(priority)
      .order("updated_at", { ascending: false })
      .order("id", { ascending: true })
      .range(start, end);
    if (error) throw error;
    return data ?? [];
  }));
  const items = pages.flat();
  return {
    items: items.slice(0, limit).map((row) => normalizeBugHuntItem(row)),
    nextOffset: items.length > limit ? offset + limit : null,
  };
}
