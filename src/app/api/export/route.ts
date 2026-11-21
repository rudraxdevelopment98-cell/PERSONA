import { dbForUser, getSessionUser } from "@/lib/db/server";

const TABLES = [
  "moments",
  "consents",
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
  "share_settings",
  "share_snapshots",
  "circle_members",
  "race_participants",
  "notifications",
];

/** Exports every row the user owns as a JSON download. Row Level Security guarantees only their data is returned. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Please sign in again." }, { status: 401 });
  const db = dbForUser(user.id);

  const out: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email, created_at: user.created_at },
  };
  const { data: profile } = await db.from("profiles").select("*").eq("id", user.id).single();
  out.profile = profile;
  for (const t of TABLES) {
    const { data } = await db.from(t).select("*").eq("user_id", user.id);
    out[t] = data ?? [];
  }
  // Social rows where the user is not in a user_id column.
  const [{ data: invites }, { data: friendships }, { data: cheers }] = await Promise.all([
    db.from("invites").select("id, kind, circle_id, max_uses, uses, expires_at, revoked_at, created_at").eq("created_by", user.id),
    db.from("friendships").select("*"),
    db.from("cheers").select("*"),
  ]);
  const { data: momentViews } = await db.from("moment_views").select("*").eq("viewer", user.id);
  out.moment_views = momentViews ?? [];
  out.invites = invites ?? [];
  out.friendships = friendships ?? [];
  out.cheers = cheers ?? [];
  return new Response(JSON.stringify(out, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="persona90-export-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
