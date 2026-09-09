import { expect, it } from "vitest";
import { readLocTaskList } from "@/lib/loc-control-center/task-list";

function fixture(id: string, priority: string, overrides = {}) {
  return { id, priority, title: "A task", details: "", owner: "", item_type: "operations",
    status: "open", updated_at: "2026-09-09T10:00:00Z", created_at: "2026-09-01T10:00:00Z",
    completed_at: null, source: "operator", source_support_report_id: null, ...overrides };
}
function database(records: ReturnType<typeof fixture>[]) {
  const reads: Array<{ count: boolean; range?: number[] }> = [];
  const expressions: string[] = [];
  const admin = { from() {
    let selected = records.slice();
    const read: { count: boolean; range?: number[] } = { count: false };
    const orders: Array<[string, boolean]> = [];
    reads.push(read);
    const query = {
      select(_fields: string, options: { head?: boolean }) { read.count = !!options.head; return query; },
      eq(field: string, value: string) { selected = selected.filter(row => row[field as keyof typeof row] === value); return query; },
      neq(field: string, value: string) { selected = selected.filter(row => row[field as keyof typeof row] !== value); return query; },
      gte(field: string, value: string) { selected = selected.filter(row => String(row[field as keyof typeof row]) >= value); return query; },
      or(expression: string) {
        expressions.push(expression);
        const predicates = [...expression.matchAll(/(\w+)\.imatch\.("(?:\\.|[^"\\])*")/g)].map(([, field, value]) => {
          return [field, new RegExp(JSON.parse(value), 'i')] as const;
        });
        selected = selected.filter(row => predicates.some(([field, match]) => match.test(String(row[field as keyof typeof row] ?? ""))));
        return query;
      },
      order(field: string, options: { ascending: boolean }) { orders.push([field, options.ascending]); return query; },
      range(start: number, end: number) { read.range = [start, end]; return query; },
      then(resolve: (value: unknown) => unknown) {
        selected.sort((a, b) => {
          for (const [field, ascending] of orders) {
            const comparison = String(a[field as keyof typeof a]).localeCompare(String(b[field as keyof typeof b]));
            if (comparison) return ascending ? comparison : -comparison;
          }
          return 0;
        });
        return Promise.resolve({ error: null, count: selected.length,
          data: read.count ? null : read.range ? selected.slice(read.range[0], read.range[1] + 1) : selected }).then(resolve);
      },
    };
    return query;
  } } as unknown as Parameters<typeof readLocTaskList>[0];
  return { admin, reads, expressions };
}

it("paginates across priority groups globally, with stable ties and one lookahead", async () => {
  const { admin, reads } = database([
    fixture("low", "low", { updated_at: "2026-09-10T10:00:00Z" }),
    fixture("urgent-b", "urgent"), fixture("urgent-a", "urgent"),
    fixture("high-old", "high", { updated_at: "2026-09-08T10:00:00Z" }),
    fixture("high-new", "high"), fixture("medium", "medium"),
  ]);
  const first = await readLocTaskList(admin, {}, { limit: 3, offset: 0 });
  expect(first.items.map(row => row.id)).toEqual(["urgent-a", "urgent-b", "high-new"]);
  expect(first.nextOffset).toBe(3);
  expect(reads.filter(read => !read.count).map(read => read.range)).toEqual([[0, 1], [0, 1]]);
  const second = await readLocTaskList(admin, {}, { limit: 3, offset: 3 });
  expect(second.items.map(row => row.id)).toEqual(["high-old", "medium", "low"]);
  expect(second.nextOffset).toBeNull();
  expect((await readLocTaskList(admin, {}, { limit: 3, offset: 12 })).items).toEqual([]);
});

it.each(["title", "details", "owner", "item_type", "status", "priority"])("searches legacy %s before counting and paging", async field => {
  const { admin } = database([fixture("match", "urgent", { [field]: field === "priority" ? "urgent" : "Needle" }), fixture("other", "low")]);
  const result = await readLocTaskList(admin, { query: field === "priority" ? "urgent" : "needle" }, { limit: 1, offset: 0 });
  expect(result.items.map(row => row.id)).toEqual(["match"]);
  expect(result.nextOffset).toBeNull();
});

it("combines status, priority, inclusive time and open-work filters before page boundaries", async () => {
  const { admin } = database([
    fixture("match", "high", { status: "blocked", updated_at: "2026-09-09T04:00:00.000Z" }),
    fixture("complete", "high", { status: "complete" }), fixture("wrong-priority", "urgent"),
    fixture("too-old", "high", { status: "blocked", updated_at: "2026-09-09T03:59:59.000Z" }),
  ]);
  const result = await readLocTaskList(admin, { status: "blocked", priority: "high", excludeComplete: true, updatedSince: "2026-09-09T04:00:00.000Z" }, { limit: 1, offset: 0 });
  expect(result.items.map(row => row.id)).toEqual(["match"]);
  expect(result.nextOffset).toBeNull();
  await expect(readLocTaskList(admin, { updatedSince: "bad-date" }, { limit: 1, offset: 0 })).rejects.toThrow("valid updated date");
});

it("treats underscore, percent and filter punctuation as literals rather than wildcard or filter syntax", async () => {
  const { admin, expressions } = database([
    fixture("literal", "high", { status: "in_progress", title: '100% ready, ("yes") * [draft]' }),
    fixture("wildcard", "high", { status: "inXprogress", title: '1000 ready, ("yes")' }),
  ]);
  for (const query of ["in_progress", '100% ready, ("yes")', '*', '[draft]']) {
    const result = await readLocTaskList(admin, { query }, { limit: 10, offset: 0 });
    expect(result.items.map(row => row.id)).toEqual(["literal"]);
  }
  expect(expressions.some(value => value.includes('status.imatch."in_progress"'))).toBe(true);
});
