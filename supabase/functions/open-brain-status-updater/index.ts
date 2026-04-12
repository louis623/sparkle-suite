import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SYNC_SECRET = Deno.env.get("SYNC_SECRET")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const STATUS_PATTERN =
  /STATUS\s+UPDATE\s*[—–-]\s*(.+?):\s*([\s\S]+?)(?:\.\s*Next\s+action:\s*([\s\S]+?))?(?:\.\s*Status:\s*(on\s+track|needs\s+attention|blocked))?\s*$/i;

function log(msg: string) {
  console.log(`[open-brain-status-updater] ${msg}`);
}

Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${SYNC_SECRET}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { record } = (await req.json()) as {
    record: { content: string; id?: string };
  };

  if (!record?.content) {
    return new Response(JSON.stringify({ status: "no_content" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const match = record.content.match(STATUS_PATTERN);
  if (!match) {
    return new Response(JSON.stringify({ status: "no_match" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const [, projectName, description, nextAction, statusText] = match;
  const trimmedName = projectName.trim();
  log(`Parsed: project="${trimmedName}", next="${nextAction?.trim()}", status="${statusText?.trim()}"`);

  // Exact name match, case-insensitive
  const { data: projects, error: queryError } = await supabase
    .from("projects")
    .select("id, name")
    .ilike("name", trimmedName);

  if (queryError) {
    log(`Query error: ${queryError.message}`);
    return new Response(JSON.stringify({ error: queryError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!projects || projects.length === 0) {
    log(`No project found: "${trimmedName}"`);
    await supabase.from("unmatched_status_updates").insert({
      content: record.content,
      parsed_project: trimmedName,
    });
    return new Response(
      JSON.stringify({ status: "no_match", project: trimmedName }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  if (projects.length > 1) {
    log(`Ambiguous match for "${trimmedName}": ${projects.map((p) => p.name).join(", ")}`);
    await supabase.from("unmatched_status_updates").insert({
      content: record.content,
      parsed_project: trimmedName,
      ambiguous_matches: projects.map((p) => p.name),
    });
    return new Response(
      JSON.stringify({ status: "ambiguous", matches: projects.length }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  const project = projects[0];
  const updateFields: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (statusText) {
    updateFields.status = statusText.trim().toLowerCase().replace(/\s+/g, "-");
  }
  if (nextAction) {
    updateFields.next_action = nextAction.trim();
  }
  if (description) {
    updateFields.scope = description.trim();
  }

  const { error: updateError } = await supabase
    .from("projects")
    .update(updateFields)
    .eq("id", project.id);

  if (updateError) {
    log(`Update error for ${project.name}: ${updateError.message}`);
    return new Response(JSON.stringify({ error: updateError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  log(`Updated project "${project.name}" (${project.id})`);
  return new Response(
    JSON.stringify({ status: "updated", project: project.name }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
