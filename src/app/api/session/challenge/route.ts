import { z } from "zod";
import { apiRoute, dbError, HttpError } from "@/lib/server/api";
import { recomputeScores } from "@/lib/server/progress";

const schema = z.object({
  session_id: z.uuid(),
  status: z.enum(["pending", "completed", "skipped"]),
  notes: z.string().trim().max(4000).nullable(),
});

/** Challenge completion is recorded separately from the session and can be updated later. */
export const POST = apiRoute(schema, async ({ session_id, status, notes }, { supabase, user }) => {
  if (status === "completed" && (!notes || notes.length < 10)) {
    throw new HttpError(400, "Describe briefly what you did and how it went.");
  }
  const { data, error } = await supabase
    .from("daily_sessions")
    .update({ challenge_status: status, challenge_notes: notes, challenge_updated_at: new Date().toISOString() })
    .eq("id", session_id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  dbError(error);
  if (!data) throw new HttpError(404, "Session not found.");
  await recomputeScores(supabase, user.id, "challenge");
  return { ok: true };
});
