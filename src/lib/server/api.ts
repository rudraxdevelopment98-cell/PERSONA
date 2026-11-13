import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AIError } from "@/lib/ai/client";
import { loadUserState, type UserState } from "./state";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

type Ctx = { supabase: SupabaseClient; user: User; state: UserState };

/**
 * Wraps a route handler: verifies the Supabase session, loads user state,
 * validates the JSON body with Zod and maps errors to safe JSON responses.
 */
export function apiRoute<S extends z.ZodType>(schema: S, handler: (body: z.infer<S>, ctx: Ctx) => Promise<unknown>) {
  return async (request: Request) => {
    try {
      const cookieStore = await cookies();
      const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (list) => list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
        },
      });
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new HttpError(401, "Please sign in again.");

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

      const state = await loadUserState(supabase, user.id, user.email);
      const result = await handler(parsed.data, { supabase, user, state });
      return NextResponse.json(result ?? { ok: true });
    } catch (err) {
      if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
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
export async function enforceHourlyLimit(supabase: SupabaseClient, userId: string, table: string, max: number, extra?: { column: string; value: string }) {
  const since = new Date(Date.now() - 3_600_000).toISOString();
  let q = supabase.from(table).select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", since);
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
