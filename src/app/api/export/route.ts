import { createClient } from "@/lib/supabase/server";

const TABLES = [
  "assessments",
  "assessment_responses",
  "daily_checkins",
  "daily_sessions",
  "generated_stories",
  "scenario_responses",
  "exercise_completions",
  "decision_logs",
  "personality_scores",
  "skill_progress",
  "achievements",
  "journal_entries",
  "coach_messages",
];

/** Exports every row the user owns as a JSON download. RLS guarantees only their data is returned. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Please sign in again." }, { status: 401 });

  const out: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email, created_at: user.created_at },
  };
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  out.profile = profile;
  for (const t of TABLES) {
    const { data } = await supabase.from(t).select("*").eq("user_id", user.id);
    out[t] = data ?? [];
  }
  return new Response(JSON.stringify(out, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="persona90-export-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
