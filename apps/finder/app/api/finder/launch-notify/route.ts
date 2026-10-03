import { NextResponse } from "next/server";
import {
  finderLaunchNotifyTable,
  parseFinderLaunchNotifyBody,
} from "@/lib/sparkle-finder/launch-notify";
import { createLiveFinderLaunchNotifyClient } from "@/lib/sparkle-finder/launch-notify-live";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "cache-control": "no-store" };

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: noStore });
  }

  const parsed = parseFinderLaunchNotifyBody(payload);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400, headers: noStore });
  }

  const supabase = createLiveFinderLaunchNotifyClient();
  if (!supabase) {
    return NextResponse.json({ error: "service_role_not_configured" }, { status: 503, headers: noStore });
  }

  const { error } = await supabase.from(finderLaunchNotifyTable).insert(parsed.row);
  if (error) {
    return NextResponse.json({ error: "launch_notify_insert_failed" }, { status: 500, headers: noStore });
  }

  return NextResponse.json({ ok: true }, { status: 201, headers: noStore });
}
