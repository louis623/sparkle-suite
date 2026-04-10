import { createClient } from "@supabase/supabase-js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-sync-key",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Validate sync key
  const syncKey = req.headers.get("x-sync-key");
  const expectedKey = Deno.env.get("LIVE_QUEUE_SYNC_KEY");
  if (!syncKey || syncKey !== expectedKey) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Parse body
  let body: { sync_code: string; queue: string[]; timestamp: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const { sync_code, queue, timestamp } = body;
  if (!sync_code || !Array.isArray(queue)) {
    return new Response(JSON.stringify({ error: "missing_fields" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Supabase client with service role key to bypass RLS for writes
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Verify sync_code exists
  const { data: existing, error: lookupError } = await supabase
    .from("live_queue")
    .select("id")
    .eq("sync_code", sync_code)
    .maybeSingle();

  if (lookupError) {
    return new Response(JSON.stringify({ error: "db_error" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  if (!existing) {
    return new Response(JSON.stringify({ error: "invalid_sync_code" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Update queue and last_updated
  const { error: updateError } = await supabase
    .from("live_queue")
    .update({
      queue,
      last_updated: timestamp ?? new Date().toISOString(),
    })
    .eq("sync_code", sync_code);

  if (updateError) {
    return new Response(JSON.stringify({ error: "update_failed" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ status: "ok" }), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
