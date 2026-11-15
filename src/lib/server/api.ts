import "server-only";
import { UpgradeRequired, getPlan } from "./plan";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AIError, runWithAIContext, runWithUserAI } from "@/lib/ai/client";
import { getUserAI } from "./ai-connection";
import { dbForUser, getSessionUser, type Db, type SessionUser } from "@/lib/db/server";
import { loadUserState, type UserState } from "./state";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

type Ctx = { db: Db; user: SessionUser; state: UserState };

/**
 * Wraps a route handler: verifies the login session, loads user state,
 * validates the JSON body with Zod and maps errors to safe JSON responses.
 */
export function apiRoute<S extends z.ZodType>(schema: S, handler: (body: z.infer<S>, ctx: Ctx) => Promise<unknown>) {
  return async (request: Request) => {
    try {
      const user = await getSessionUser();
      if (!user) throw new HttpError(401, "Please sign in again.");
      const db = dbForUser(user.id);

      let json: unknown = {};
      if (request.headers.get("content-length") !== "0") {
        try {
          json = await request.json();
        } catch {
          json = {};
        }
      }
      const parsed = schema.safeParse(json);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid request.");

      const [state, ai, plan] = await Promise.all([loadUserState(db, user.id, user.email), getUserAI(db, user.id), getPlan(user.id)]);
      // Every AI call in this request uses the user's own provider if they connected one,
      // otherwise the model for their plan; calls are metered against this feature.
      const feature = new URL(request.url).pathname.replace(/^\/api\//, "").replace(/\//g, ".");
      const result = await runWithAIContext({ userId: user.id, feature, tier: plan.plan }, () =>
        runWithUserAI(ai, () => handler(parsed.data, { db, user, state })),
      );
      return NextResponse.json(result ?? { ok: true });
    } catch (err) {
      if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
      if (err instanceof UpgradeRequired) return NextResponse.json({ error: err.message, upgrade: true }, { status: 402 });
      if (err instanceof AIError) {
        const status = err.code === "not_configured" ? 503 : err.code === "refusal" ? 422 : 502;
        return NextResponse.json({ error: err.message }, { status });
      }
      console.error("API error", err);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
  };
}

/** Simple per-user rate limit based on rows created in the last hour. */
export async function enforceHourlyLimit(db: Db, userId: string, table: string, max: number, extra?: { column: string; value: string }) {
  const since = new Date(Date.now() - 3_600_000).toISOString();
  let q = db.from(table).select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", since);
  if (extra) q = q.eq(extra.column, extra.value);
  const { count } = await q;
  if ((count ?? 0) >= max) throw new HttpError(429, "You've reached the hourly limit for this activity. Take a break and come back soon.");
}

export function requireBaseline(state: UserState) {
  if (!state.baseline || state.skills.length === 0) throw new HttpError(409, "Complete the initial assessment first.");
}

export function dbError(error: { message: string } | null) {
  if (error) {
    console.error("DB error", error.message);
    throw new HttpError(500, "Could not save your data. Please try again.");
  }
}
