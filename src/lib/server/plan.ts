import "server-only";
import { cache } from "react";
import { getPool } from "@/lib/db/pool";
import { FREE_LIMITS, TRIAL_DAYS, type PlanInfo } from "@/lib/domain/plans";

const q = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => (await getPool().query(sql, params)).rows as T[];

export class UpgradeRequired extends Error {
  readonly upgrade = true;
}

type SubRow = {
  status: NonNullable<PlanInfo["status"]>;
  source: NonNullable<PlanInfo["source"]>;
  current_period_end: string | null;
  cancel_at: string | null;
  billing_cycle: "month" | "year" | null;
  trial_used_at: string | null;
};

/** The user's plan, resolved from their subscription (or a trial, coupon or admin grant). */
export const getPlan = cache(async (userId: string): Promise<PlanInfo> => {
  const [[sub], [extra]] = await Promise.all([
    q<SubRow>("select status, source, current_period_end, cancel_at, billing_cycle, trial_used_at from public.subscriptions where user_id = $1", [userId]),
    q<{ admin: boolean; own_ai: boolean }>(
      `select exists (select 1 from public.admins where user_id = $1) as admin,
              exists (select 1 from public.ai_connections where user_id = $1) as own_ai`,
      [userId],
    ),
  ]);
  const notExpired = !sub?.current_period_end || Date.parse(sub.current_period_end) > Date.now();
  // Paddle keeps "past_due" subscriptions running while it retries the payment.
  const pro = Boolean(sub && ["active", "trialing", "past_due"].includes(sub.status) && notExpired);
  const isAdmin = Boolean(extra?.admin);
  return {
    plan: pro || isAdmin ? "pro" : "free",
    status: sub?.status ?? null,
    source: sub?.source ?? null,
    endsAt: sub?.current_period_end ?? null,
    cancelAt: sub?.cancel_at ?? null,
    billingCycle: sub?.billing_cycle ?? null,
    trialAvailable: !sub?.trial_used_at && !pro,
    unlimitedAI: pro || isAdmin || Boolean(extra?.own_ai),
    isAdmin,
  };
});

export type Usage = { decisions: number; communication: number; coachToday: number; circlesOwned: number; activeRaces: number };

export async function usage(userId: string): Promise<Usage> {
  const [r] = await q<Usage>(
    `select
      (select count(*)::int from public.decision_logs where user_id = $1 and created_at > now() - interval '7 days') as decisions,
      (select count(*)::int from public.exercise_completions where user_id = $1 and created_at > now() - interval '7 days') as communication,
      (select count(*)::int from public.coach_messages where user_id = $1 and role = 'user' and created_at > now() - interval '1 day') as "coachToday",
      (select count(*)::int from public.circle_members where user_id = $1 and role = 'owner') as "circlesOwned",
      (select count(*)::int from public.races where created_by = $1 and cancelled_at is null and ends_at > now()) as "activeRaces"`,
    [userId],
  );
  return r;
}

type Kind = "decision" | "communication" | "coach" | "circle" | "race";

const MESSAGES: Record<Kind, string> = {
  decision: `You've used your ${FREE_LIMITS.decisionsPerWeek} free Decision Lab scenarios this week. Pro is unlimited - or try again in a few days.`,
  communication: `You've used your ${FREE_LIMITS.communicationPerWeek} free Communication Lab exercises this week. Pro is unlimited - or try again in a few days.`,
  coach: `You've sent ${FREE_LIMITS.coachPerDay} coach messages today, the free daily limit. Pro is unlimited - or come back tomorrow.`,
  circle: `Free accounts can start ${FREE_LIMITS.circlesOwned} circle. Go Pro to start more - you can still join other people's circles.`,
  race: `Free accounts can run ${FREE_LIMITS.activeRacesCreated} races at once. Go Pro for unlimited races, or wait for one to finish.`,
};

/** Throws UpgradeRequired when a free user has reached the limit for this feature. */
export async function assertWithinLimit(userId: string, kind: Kind) {
  const plan = await getPlan(userId);
  if (plan.plan === "pro") return;
  // AI features are unlimited when the user's own AI key pays for them.
  if ((kind === "decision" || kind === "communication" || kind === "coach") && plan.unlimitedAI) return;
  const u = await usage(userId);
  const over =
    (kind === "decision" && u.decisions >= FREE_LIMITS.decisionsPerWeek) ||
    (kind === "communication" && u.communication >= FREE_LIMITS.communicationPerWeek) ||
    (kind === "coach" && u.coachToday >= FREE_LIMITS.coachPerDay) ||
    (kind === "circle" && u.circlesOwned >= FREE_LIMITS.circlesOwned) ||
    (kind === "race" && u.activeRaces >= FREE_LIMITS.activeRacesCreated);
  if (over) throw new UpgradeRequired(MESSAGES[kind]);
}

export type EpisodeAllowance = { lite: boolean; used: number; limit: number; nextAt: string | null; trialAvailable: boolean };

/**
 * Whether today gets a full episode. Pro, own-key users and everyone in their first
 * week always do; free accounts then get FREE_LIMITS.episodesPerWeek per rolling 7 days.
 */
export async function episodeAllowance(userId: string, day: number): Promise<EpisodeAllowance> {
  const plan = await getPlan(userId);
  const limit = FREE_LIMITS.episodesPerWeek;
  if (plan.unlimitedAI || day <= FREE_LIMITS.dailyEpisodeDays) return { lite: false, used: 0, limit, nextAt: null, trialAvailable: plan.trialAvailable };
  const rows = await q<{ created_at: string }>(
    "select created_at from public.daily_sessions where user_id = $1 and created_at > now() - interval '7 days' order by created_at asc",
    [userId],
  );
  if (rows.length < limit) return { lite: false, used: rows.length, limit, nextAt: null, trialAvailable: plan.trialAvailable };
  const nextAt = new Date(Date.parse(rows[rows.length - limit].created_at) + 7 * 86_400_000).toISOString();
  return { lite: true, used: rows.length, limit, nextAt, trialAvailable: plan.trialAvailable };
}

/** Grants Pro for a number of days (trial, coupon or admin), extending any time left. */
export async function grantPro(userId: string, days: number, source: "trial" | "coupon" | "admin" | "referral") {
  await q(
    `insert into public.subscriptions (user_id, status, source, current_period_end, trial_used_at, updated_at)
     values ($1, $2, $3, now() + make_interval(days => $4), case when $3 = 'trial' then now() end, now())
     on conflict (user_id) do update set
       status = case when public.subscriptions.source = 'paddle' and public.subscriptions.status in ('active', 'trialing', 'past_due')
                     then public.subscriptions.status else excluded.status end,
       source = case when public.subscriptions.source = 'paddle' and public.subscriptions.status in ('active', 'trialing', 'past_due')
                     then public.subscriptions.source else excluded.source end,
       current_period_end = greatest(coalesce(public.subscriptions.current_period_end, now()), now()) + make_interval(days => $4),
       trial_used_at = coalesce(public.subscriptions.trial_used_at, excluded.trial_used_at),
       updated_at = now()`,
    [userId, source === "trial" ? "trialing" : "active", source, days],
  );
}

export async function startTrial(userId: string) {
  const plan = await getPlan(userId);
  if (!plan.trialAvailable) throw new UpgradeRequired(plan.plan === "pro" ? "You already have Pro." : "Your free trial has already been used.");
  await grantPro(userId, TRIAL_DAYS, "trial");
}

export async function redeemCoupon(userId: string, rawCode: string): Promise<number> {
  const code = rawCode.trim().toUpperCase();
  if (!/^[A-Z0-9-]{4,32}$/.test(code)) throw new UpgradeRequired("That code isn't valid.");
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const { rows } = await client.query<{ days: number }>(
      `update public.coupons set uses = uses + 1
        where code = $1 and uses < max_uses and (expires_at is null or expires_at > now())
          and not exists (select 1 from public.coupon_redemptions r where r.code = $1 and r.user_id = $2)
        returning days`,
      [code, userId],
    );
    if (!rows[0]) throw new UpgradeRequired("That code isn't valid, has expired or was already used.");
    await client.query("insert into public.coupon_redemptions (code, user_id) values ($1, $2)", [code, userId]);
    await client.query("commit");
    await grantPro(userId, rows[0].days, "coupon");
    return rows[0].days;
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
