import "server-only";
import { getPool } from "@/lib/db/pool";
import { hash } from "@/lib/domain/variety";
import { getPlan } from "./plan";

const q = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => (await getPool().query(sql, params)).rows as T[];

export type Placement = "dashboard" | "after_session" | "labs";
export type SponsorCardData = { id: string; sponsor: string; category: string; title: string; body: string; cta: string; placement: Placement };

/**
 * Picks one sponsored card for a Free user (Pro users never see ads), counts a
 * view once per user per day, and stays the same card for that user all day.
 */
export async function pickSponsor(userId: string, placement: Placement, ctx: { language: string; skill?: string | null; day: string }): Promise<SponsorCardData | null> {
  try {
    const plan = await getPlan(userId);
    if (plan.plan === "pro") return null;
    const rows = await q<{ id: string; sponsor_name: string; category: string; title: string; body: string; cta_label: string; weight: number }>(
      `select c.id, c.sponsor_name, c.category, c.title, c.body, c.cta_label, c.weight
         from public.sponsor_campaigns c
        where c.active and c.starts_at <= now() and (c.ends_at is null or c.ends_at > now())
          and $1 = any(c.placements)
          and (c.languages is null or $2 = any(c.languages))
          and (c.skills is null or $3::text is null or $3 = any(c.skills))
          and (c.max_views is null or c.max_views > coalesce((select sum(views) from public.sponsor_stats s where s.campaign_id = c.id), 0))`,
      [placement, ctx.language, ctx.skill ?? null],
    );
    if (!rows.length) return null;
    // Weighted pick, stable for this user, day and placement.
    const total = rows.reduce((a, r) => a + r.weight, 0);
    let ticket = hash(`${userId}:${ctx.day}:${placement}`) % total;
    const c = rows.find((r) => (ticket -= r.weight) < 0) ?? rows[0];
    const seen = await getPool().query("insert into public.sponsor_seen (campaign_id, user_id, day) values ($1, $2, $3) on conflict do nothing", [c.id, userId, ctx.day]);
    if (seen.rowCount) {
      await q(
        `insert into public.sponsor_stats (campaign_id, day, placement, views) values ($1, $2, $3, 1)
         on conflict (campaign_id, day, placement) do update set views = public.sponsor_stats.views + 1`,
        [c.id, ctx.day, placement],
      );
    }
    return { id: c.id, sponsor: c.sponsor_name, category: c.category, title: c.title, body: c.body, cta: c.cta_label, placement };
  } catch (err) {
    console.warn("[sponsors] skipped:", (err as Error).message);
    return null;
  }
}

/** Records a click and returns the campaign's link (https only). */
export async function clickSponsor(campaignId: string, placement: string): Promise<string | null> {
  const [c] = await q<{ url: string }>("select url from public.sponsor_campaigns where id = $1", [campaignId]);
  if (!c || !c.url.startsWith("https://")) return null;
  const p = ["dashboard", "after_session", "labs"].includes(placement) ? placement : "dashboard";
  await q(
    `insert into public.sponsor_stats (campaign_id, day, placement, clicks) values ($1, current_date, $2, 1)
     on conflict (campaign_id, day, placement) do update set clicks = public.sponsor_stats.clicks + 1`,
    [campaignId, p],
  );
  return c.url;
}

export async function submitRequest(input: { name: string; email: string; category: string; link: string; budget: string; message: string }) {
  const [{ n }] = await q<{ n: number }>("select count(*)::int as n from public.sponsor_requests where created_at > now() - interval '1 hour'");
  if (n >= 20) throw new Error("busy");
  await q("insert into public.sponsor_requests (name, email, category, link, budget, message) values ($1, $2, $3, $4, $5, $6)", [
    input.name,
    input.email,
    input.category,
    input.link || null,
    input.budget || null,
    input.message || null,
  ]);
  const admins = await q<{ user_id: string }>("select user_id from public.admins");
  const { notify } = await import("./social");
  await Promise.all(admins.map((a) => notify(a.user_id, "sponsor_request", { title: "📣 New promotion request", body: `${input.name}: ${input.category}`, url: "/admin/sponsors" }).catch(() => {})));
}
