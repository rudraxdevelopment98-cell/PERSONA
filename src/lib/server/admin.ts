import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { getPool } from "@/lib/db/pool";
import { notify } from "./social";

/**
 * Admin tools. Admins are recorded in public.admins (server-only). The first
 * admin claims the role with the one-time ADMIN_SETUP_CODE set on the server;
 * once an admin exists, the code no longer works.
 */

const q = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => (await getPool().query(sql, params)).rows as T[];

export class AdminError extends Error {}

/** Records an admin action (who, what, on whom). Never throws. */
export async function audit(actor: string, action: string, target?: { user?: string | null; label?: string | null }, detail?: string) {
  await q("insert into public.admin_audit (admin_id, action, target_user, target_label, detail) values ($1, $2, $3, $4, $5)", [
    actor,
    action,
    target?.user ?? null,
    target?.label?.slice(0, 200) ?? null,
    detail?.slice(0, 1000) ?? null,
  ]).catch(() => {});
}

async function labelFor(userId: string) {
  const [r] = await q<{ label: string }>(`select coalesce(nullif(p.display_name, ''), 'Member') || ' <' || u.email || '>' as label from "user" u left join public.profiles p on p.id = u.id where u.id = $1`, [userId]);
  return r?.label ?? userId;
}

export async function isAdmin(userId: string): Promise<boolean> {
  const r = await q("select 1 from public.admins where user_id = $1", [userId]);
  return r.length > 0;
}

export async function hasAnyAdmin(): Promise<boolean> {
  const r = await q("select 1 from public.admins limit 1");
  return r.length > 0;
}

export async function requireAdmin(userId: string) {
  if (!(await isAdmin(userId))) throw new AdminError("Admins only.");
}

export async function claimAdmin(userId: string, code: string): Promise<void> {
  // The code comes from the server environment, or a stored hash of it.
  const digest = (v: string) => createHash("sha256").update(`persona90-admin-setup:${v.trim()}`).digest();
  const env = process.env.ADMIN_SETUP_CODE ?? "";
  let expected: Buffer | null = env.length >= 16 ? digest(env) : null;
  if (!expected) {
    const [row] = await q<{ value: string }>("select value from public.app_settings where key = 'admin_setup_hash'");
    if (row?.value && /^[0-9a-f]{64}$/.test(row.value)) expected = Buffer.from(row.value, "hex");
  }
  if (!expected) throw new AdminError("Admin setup is not configured on this server.");
  if (!timingSafeEqual(digest(code), expected)) throw new AdminError("That code isn't right.");
  // Only the very first admin can use the setup code.
  const res = await getPool().query(
    "insert into public.admins (user_id) select $1 where not exists (select 1 from public.admins) on conflict do nothing",
    [userId],
  );
  if (!res.rowCount) throw new AdminError("An admin already exists. Ask them to add you.");
}

export async function addAdmin(actor: string, email: string) {
  await requireAdmin(actor);
  const [u] = await q<{ id: string }>('select id from "user" where lower(email) = lower($1)', [email.trim()]);
  if (!u) throw new AdminError("No account with that email.");
  await q("insert into public.admins (user_id) values ($1) on conflict do nothing", [u.id]);
  await audit(actor, "admin.add", { user: u.id, label: await labelFor(u.id) });
}

export async function removeAdmin(actor: string, userId: string) {
  await requireAdmin(actor);
  if (actor === userId) throw new AdminError("You can't remove yourself.");
  await q("delete from public.admins where user_id = $1", [userId]);
  await audit(actor, "admin.remove", { user: userId, label: await labelFor(userId) });
}

export async function stats() {
  type Counts = { users: number; new_7d: number; active_1d: number; active_7d: number; assessments: number; sessions: number; sessions_7d: number; friendships: number; circles: number; open_reports: number; suspended: number };
  const [r] = await q<Counts>(`select
    (select count(*)::int from "user") as users,
    (select count(*)::int from "user" where "createdAt" > now() - interval '7 days') as new_7d,
    (select count(distinct user_id)::int from (
        select user_id from public.daily_checkins where completed_at > now() - interval '1 day'
        union select user_id from public.daily_sessions where completed_at > now() - interval '1 day') a) as active_1d,
    (select count(distinct user_id)::int from (
        select user_id from public.daily_checkins where completed_at > now() - interval '7 days'
        union select user_id from public.daily_sessions where completed_at > now() - interval '7 days') a) as active_7d,
    (select count(*)::int from public.assessments where status = 'completed' and kind = 'baseline') as assessments,
    (select count(*)::int from public.daily_sessions where completed_at is not null) as sessions,
    (select count(*)::int from public.daily_sessions where completed_at > now() - interval '7 days') as sessions_7d,
    (select count(*)::int from public.friendships where status = 'accepted') as friendships,
    (select count(*)::int from public.circles) as circles,
    (select count(*)::int from public.reports where status = 'open') as open_reports,
    (select count(*)::int from public.profiles where suspended_at is not null) as suspended`);
  const daily = await q<{ d: string; n: number }>(
    `select to_char(d, 'YYYY-MM-DD') as d, coalesce((select count(*)::int from public.daily_sessions s where s.completed_at::date = d), 0) as n
       from generate_series(current_date - 13, current_date, interval '1 day') d order by d`,
  );
  return { ...r, daily };
}

export type ReportRow = {
  id: string;
  reason: string;
  details: string | null;
  created_at: string;
  status: "open" | "resolved" | "dismissed";
  resolution: string | null;
  resolved_at: string | null;
  reporter_name: string;
  target_id: string | null;
  target_name: string | null;
  target_email: string | null;
  target_suspended: boolean;
  circle_id: string | null;
  circle_name: string | null;
  prior_reports: number;
};

export async function listReports(status: "open" | "closed") {
  return q<ReportRow>(
    `select r.id, r.reason, r.details, r.created_at, r.status, r.resolution, r.resolved_at,
            coalesce(nullif(rp.display_name, ''), 'Member') as reporter_name,
            r.target_user as target_id, coalesce(nullif(tp.display_name, ''), 'Member') as target_name, tu.email as target_email,
            tp.suspended_at is not null as target_suspended,
            r.circle_id, c.name as circle_name,
            (select count(*)::int from public.reports x where x.target_user = r.target_user and x.id <> r.id) as prior_reports
       from public.reports r
       left join public.profiles rp on rp.id = r.reporter
       left join public.profiles tp on tp.id = r.target_user
       left join "user" tu on tu.id = r.target_user
       left join public.circles c on c.id = r.circle_id
      where ${status === "open" ? "r.status = 'open'" : "r.status <> 'open'"}
      order by r.created_at ${status === "open" ? "asc" : "desc"} limit 100`,
  );
}

export async function closeReport(actor: string, id: string, status: "resolved" | "dismissed", note: string) {
  await requireAdmin(actor);
  await q("update public.reports set status = $2, resolution = $3, resolved_at = now(), resolved_by = $4 where id = $1", [id, status, note.slice(0, 500) || null, actor]);
  await audit(actor, `report.${status}`, { label: `report ${id.slice(0, 8)}` }, note);
}

/** Blocks sign-in and ends every session of the account. */
export async function suspendUser(actor: string, userId: string) {
  await requireAdmin(actor);
  if (actor === userId) throw new AdminError("You can't suspend yourself.");
  if (await isAdmin(userId)) throw new AdminError("Admins can't be suspended.");
  await q("update public.profiles set suspended_at = now() where id = $1", [userId]);
  await q('delete from "session" where "userId" = $1', [userId]);
  await audit(actor, "user.suspend", { user: userId, label: await labelFor(userId) });
}

export async function unsuspendUser(actor: string, userId: string) {
  await requireAdmin(actor);
  await q("update public.profiles set suspended_at = null where id = $1", [userId]);
  await audit(actor, "user.unsuspend", { user: userId, label: await labelFor(userId) });
}

export async function deleteCircle(actor: string, circleId: string) {
  await requireAdmin(actor);
  const [c] = await q<{ name: string }>("select name from public.circles where id = $1", [circleId]);
  await q("delete from public.circles where id = $1", [circleId]);
  await audit(actor, "circle.delete", { label: c?.name ?? circleId });
}

export async function isSuspended(userId: string): Promise<boolean> {
  const r = await q("select 1 from public.profiles where id = $1 and suspended_at is not null", [userId]);
  return r.length > 0;
}

/** Tells every admin about a new report (in-app + push). */
export async function notifyAdminsOfReport(reason: string) {
  const admins = await q<{ user_id: string }>("select user_id from public.admins");
  await Promise.all(
    admins.map((a) => notify(a.user_id, "report", { title: "🚩 New report", body: reason, url: "/admin" }).catch(() => {})),
  );
}

export async function openReportCount(): Promise<number> {
  const [r] = await q<{ n: number }>("select count(*)::int as n from public.reports where status = 'open'");
  return r?.n ?? 0;
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export async function insights() {
  const [funnel] = await q<Record<string, number>>(`select
    (select count(*)::int from "user") as signed_up,
    (select count(distinct user_id)::int from public.assessments where status = 'completed' and kind = 'baseline') as assessed,
    (select count(distinct user_id)::int from public.daily_checkins where completed_at is not null) as checked_in,
    (select count(distinct user_id)::int from public.daily_sessions where completed_at is not null) as first_session,
    (select count(*)::int from (select user_id from public.daily_sessions where completed_at is not null group by user_id having count(*) >= 3) a) as three_sessions,
    (select count(*)::int from (select user_id from public.daily_sessions where completed_at is not null group by user_id having count(*) >= 7) a) as week_one,
    (select count(*)::int from (select user_id from public.daily_sessions where completed_at is not null group by user_id having count(*) >= 30) a) as month_one`);
  // Day-1 / day-7 return: of users who signed up 2+ / 8+ days ago, how many were active on day 2 / any of days 7-13.
  const [ret] = await q<{ d1_base: number; d1: number; d7_base: number; d7: number }>(`
    with u as (select id, "createdAt"::date as joined from "user"),
    act as (select user_id, completed_at::date as d from public.daily_checkins where completed_at is not null
            union select user_id, completed_at::date from public.daily_sessions where completed_at is not null)
    select
      (select count(*)::int from u where joined <= current_date - 2) as d1_base,
      (select count(distinct u.id)::int from u join act on act.user_id = u.id and act.d = u.joined + 1 where u.joined <= current_date - 2) as d1,
      (select count(*)::int from u where joined <= current_date - 8) as d7_base,
      (select count(distinct u.id)::int from u join act on act.user_id = u.id and act.d between u.joined + 7 and u.joined + 13 where u.joined <= current_date - 8) as d7`);
  const languages = await q<{ k: string; n: number }>("select language as k, count(*)::int as n from public.profiles group by language order by n desc");
  const depths = await q<{ k: string; n: number }>("select depth as k, count(*)::int as n from public.assessments where status = 'completed' and kind = 'baseline' group by depth order by n desc");
  const worlds = await q<{ k: string; n: number }>("select variety->>'world' as k, count(distinct user_id)::int as n from public.daily_sessions where variety is not null group by 1 order by n desc limit 6");
  const daily = await q<{ d: string; signups: number; sessions: number; active: number }>(`
    select to_char(d, 'YYYY-MM-DD') as d,
      (select count(*)::int from "user" where "createdAt"::date = d) as signups,
      (select count(*)::int from public.daily_sessions where completed_at::date = d) as sessions,
      (select count(distinct user_id)::int from (
        select user_id from public.daily_checkins where completed_at::date = d
        union select user_id from public.daily_sessions where completed_at::date = d) a) as active
    from generate_series(current_date - 13, current_date, interval '1 day') d order by d`);
  return { funnel, ret, languages, depths, worlds, daily };
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export type UserRow = {
  id: string;
  name: string;
  email: string;
  joined: string;
  sessions: number;
  last_active: string | null;
  streak: number | null;
  suspended: boolean;
  admin: boolean;
  language: string;
};

export async function listUsers(opts: { search?: string; filter?: string; page?: number }) {
  const page = Math.max(0, opts.page ?? 0);
  const params: unknown[] = [];
  const where: string[] = [];
  if (opts.search?.trim()) {
    params.push(`%${opts.search.trim().toLowerCase()}%`);
    where.push(`(lower(u.email) like $${params.length} or lower(coalesce(p.display_name, '')) like $${params.length})`);
  }
  const active = `exists (select 1 from public.daily_checkins c where c.user_id = u.id and c.completed_at > now() - interval '7 days')`;
  if (opts.filter === "active") where.push(active);
  if (opts.filter === "inactive") where.push(`not ${active}`);
  if (opts.filter === "suspended") where.push("p.suspended_at is not null");
  if (opts.filter === "admins") where.push("exists (select 1 from public.admins a where a.user_id = u.id)");
  params.push(page * 50);
  const rows = await q<UserRow & { total: number }>(
    `select u.id, coalesce(nullif(p.display_name, ''), 'Member') as name, u.email, u."createdAt" as joined,
       (select count(*)::int from public.daily_sessions s where s.user_id = u.id and s.completed_at is not null) as sessions,
       greatest((select max(completed_at) from public.daily_checkins c where c.user_id = u.id), (select max(completed_at) from public.daily_sessions s where s.user_id = u.id)) as last_active,
       sn.streak, p.suspended_at is not null as suspended, exists (select 1 from public.admins a where a.user_id = u.id) as admin,
       coalesce(p.language, 'en') as language, count(*) over ()::int as total
     from "user" u left join public.profiles p on p.id = u.id left join public.share_snapshots sn on sn.user_id = u.id
     ${where.length ? `where ${where.join(" and ")}` : ""}
     order by u."createdAt" desc limit 50 offset $${params.length}`,
    params,
  );
  return { rows, total: rows[0]?.total ?? 0, page };
}

export async function userDetail(userId: string) {
  const [u] = await q<UserRow & { timezone: string; programme_start_date: string | null; depth: string | null; level: number | null; xp: number | null }>(
    `select u.id, coalesce(nullif(p.display_name, ''), 'Member') as name, u.email, u."createdAt" as joined, p.timezone, p.programme_start_date::text,
       p.suspended_at is not null as suspended, exists (select 1 from public.admins a where a.user_id = u.id) as admin, coalesce(p.language, 'en') as language,
       (select depth from public.assessments a where a.user_id = u.id and a.kind = 'baseline' and a.status = 'completed' limit 1) as depth,
       sn.level, sn.xp, sn.streak
     from "user" u left join public.profiles p on p.id = u.id left join public.share_snapshots sn on sn.user_id = u.id where u.id = $1`,
    [userId],
  );
  if (!u) return null;
  const [c] = await q<Record<string, number>>(`select
     (select count(*)::int from public.daily_checkins where user_id = $1 and completed_at is not null) as checkins,
     (select count(*)::int from public.daily_sessions where user_id = $1 and completed_at is not null) as sessions,
     (select count(*)::int from public.decision_logs where user_id = $1 and score is not null) as decisions,
     (select count(*)::int from public.exercise_completions where user_id = $1 and score is not null) as communication,
     (select count(*)::int from public.coach_messages where user_id = $1 and role = 'user') as coach_messages,
     (select count(*)::int from public.journal_entries where user_id = $1) as journal_entries,
     (select count(*)::int from public.achievements where user_id = $1) as badges,
     (select count(*)::int from public.friendships where (user_low = $1 or user_high = $1) and status = 'accepted') as friends,
     (select count(*)::int from public.circle_members where user_id = $1) as circles,
     (select count(*)::int from public.reports where target_user = $1) as reports_against,
     (select count(*)::int from public.reports where reporter = $1) as reports_made,
     (select count(*)::int from "session" where "userId" = $1 and "expiresAt" > now()) as devices`, [userId]);
  const days = await q<{ d: string; n: number }>(
    `select to_char(d, 'YYYY-MM-DD') as d,
       (select count(*)::int from public.daily_checkins where user_id = $1 and completed_at::date = d)
       + (select count(*)::int from public.daily_sessions where user_id = $1 and completed_at::date = d) as n
     from generate_series(current_date - 13, current_date, interval '1 day') d order by d`,
    [userId],
  );
  return { user: u, counts: c, days };
}

export async function deleteUser(actor: string, userId: string) {
  await requireAdmin(actor);
  if (actor === userId) throw new AdminError("Delete your own account from Settings.");
  if (await isAdmin(userId)) throw new AdminError("Remove admin access first.");
  const label = await labelFor(userId);
  await q('delete from "user" where id = $1', [userId]);
  await audit(actor, "user.delete", { label });
}

export async function makeAdmin(actor: string, userId: string) {
  await requireAdmin(actor);
  await q("insert into public.admins (user_id) values ($1) on conflict do nothing", [userId]);
  await audit(actor, "admin.add", { user: userId, label: await labelFor(userId) });
}

export async function messageUser(actor: string, userId: string, title: string, body: string) {
  await requireAdmin(actor);
  await notify(userId, "admin_message", { title: title.slice(0, 80), body: body.slice(0, 300), url: "/inbox" });
  await audit(actor, "user.message", { user: userId, label: await labelFor(userId) }, title);
}

// ---------------------------------------------------------------------------
// Broadcasts
// ---------------------------------------------------------------------------

export type Audience = "all" | "active" | "inactive";
const audienceSql: Record<Audience, string> = {
  all: "true",
  active: "exists (select 1 from public.daily_checkins c where c.user_id = p.id and c.completed_at > now() - interval '7 days')",
  inactive: "not exists (select 1 from public.daily_checkins c where c.user_id = p.id and c.completed_at > now() - interval '7 days')",
};

export async function audienceSize(audience: Audience) {
  const [r] = await q<{ n: number }>(`select count(*)::int as n from public.profiles p where p.suspended_at is null and ${audienceSql[audience]}`);
  return r?.n ?? 0;
}

export async function broadcast(actor: string, input: { title: string; body: string; url: string; audience: Audience }) {
  await requireAdmin(actor);
  const [{ n }] = await q<{ n: number }>("select count(*)::int as n from public.broadcasts where created_at > now() - interval '1 hour'");
  if (n >= 3) throw new AdminError("Slow down: at most 3 announcements per hour.");
  const url = input.url && input.url.startsWith("/") && !input.url.startsWith("//") ? input.url : "/inbox";
  const users = await q<{ id: string }>(`select p.id from public.profiles p where p.suspended_at is null and ${audienceSql[input.audience]}`);
  const payload = JSON.stringify({ title: input.title, body: input.body, url });
  // One insert for the inbox, then push in small batches.
  await q("insert into public.notifications (user_id, type, payload) select unnest($1::text[]), 'announcement', $2::jsonb", [users.map((u) => u.id), payload]);
  const { sendPush } = await import("./push");
  for (let i = 0; i < users.length; i += 20) {
    await Promise.all(users.slice(i, i + 20).map((u) => sendPush(u.id, { title: input.title, body: input.body, url })));
  }
  await q("insert into public.broadcasts (admin_id, title, body, url, audience, recipients) values ($1, $2, $3, $4, $5, $6)", [actor, input.title, input.body, url, input.audience, users.length]);
  await audit(actor, "broadcast.send", { label: `${input.audience} (${users.length})` }, input.title);
  return users.length;
}

export async function listBroadcasts() {
  return q<{ id: string; title: string; body: string; audience: string; recipients: number; created_at: string; admin_name: string }>(
    `select b.id, b.title, b.body, b.audience, b.recipients, b.created_at, coalesce(nullif(p.display_name, ''), 'Admin') as admin_name
       from public.broadcasts b left join public.profiles p on p.id = b.admin_id order by b.created_at desc limit 30`,
  );
}

export async function auditLog() {
  return q<{ id: string; action: string; target_label: string | null; detail: string | null; created_at: string; admin_name: string }>(
    `select a.id, a.action, a.target_label, a.detail, a.created_at, coalesce(nullif(p.display_name, ''), 'Admin') as admin_name
       from public.admin_audit a left join public.profiles p on p.id = a.admin_id order by a.created_at desc limit 100`,
  );
}

export async function listAdmins() {
  return q<{ id: string; name: string; email: string; since: string }>(
    `select a.user_id as id, coalesce(nullif(p.display_name, ''), 'Member') as name, u.email, a.created_at as since
       from public.admins a join "user" u on u.id = a.user_id left join public.profiles p on p.id = a.user_id order by a.created_at`,
  );
}

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

export async function createCoupon(actor: string, input: { code: string; days: number; maxUses: number; expiresInDays: number | null; note: string }) {
  await requireAdmin(actor);
  const code = input.code.trim().toUpperCase();
  if (!/^[A-Z0-9-]{4,32}$/.test(code)) throw new AdminError("Codes use 4-32 letters, numbers or dashes.");
  const res = await getPool().query(
    `insert into public.coupons (code, days, max_uses, expires_at, note, created_by)
     values ($1, $2, $3, case when $4::int is null then null else now() + make_interval(days => $4::int) end, $5, $6) on conflict do nothing`,
    [code, input.days, input.maxUses, input.expiresInDays, input.note.slice(0, 200) || null, actor],
  );
  if (!res.rowCount) throw new AdminError("That code already exists.");
  await audit(actor, "coupon.create", { label: code }, `${input.days} days × ${input.maxUses}`);
}

export async function listCoupons() {
  return q<{ code: string; days: number; max_uses: number; uses: number; expires_at: string | null; note: string | null; created_at: string }>(
    "select code, days, max_uses, uses, expires_at, note, created_at from public.coupons order by created_at desc limit 50",
  );
}

export async function deleteCoupon(actor: string, code: string) {
  await requireAdmin(actor);
  await q("delete from public.coupons where code = $1", [code]);
  await audit(actor, "coupon.delete", { label: code });
}

export async function grantProByEmail(actor: string, email: string, days: number) {
  await requireAdmin(actor);
  const [u] = await q<{ id: string }>('select id from "user" where lower(email) = lower($1)', [email.trim()]);
  if (!u) throw new AdminError("No account with that email.");
  const { grantPro } = await import("./plan");
  await grantPro(u.id, days, "admin");
  await notify(u.id, "gift", { title: "🎁 You've got PERSONA 90 Pro", body: `${days} days of Pro have been added to your account. Enjoy unlimited practice!`, url: "/pricing" }).catch(() => {});
  await audit(actor, "plan.grant", { user: u.id, label: await labelFor(u.id) }, `${days} days`);
}

// ---------------------------------------------------------------------------
// AI models and costs
// ---------------------------------------------------------------------------

export async function aiTiers(): Promise<{ free: string; pro: string; light: string; lightForPro: boolean }> {
  type C = { provider: string; model: string };
  const [r] = await q<{ value: { free?: C; pro?: C; light?: C; lightForPro?: boolean } }>("select value from public.app_settings where key = 'ai_tiers'");
  const id = (c?: C) => (!c || c.provider === "default" ? "default" : `${c.provider}:${c.model}`);
  return { free: id(r?.value.free), pro: id(r?.value.pro), light: id(r?.value.light), lightForPro: Boolean(r?.value.lightForPro) };
}

export async function saveVoice(actor: string, model: string, proPerMonth: number, freePerMonth: number) {
  await requireAdmin(actor);
  const { VOICE_CHOICES } = await import("@/lib/domain/voice");
  const choice = VOICE_CHOICES.find((v) => v.id === model);
  if (!choice) throw new AdminError("Unknown voice model.");
  if (!Number.isFinite(proPerMonth) || !Number.isFinite(freePerMonth)) throw new AdminError("Enter numbers for the monthly limits.");
  const { saveVoiceConfig } = await import("./voice");
  const saved = await saveVoiceConfig({ model: choice.id, proPerMonth, freePerMonth });
  await audit(actor, "ai.voice", { label: `${saved.model} pro=${saved.proPerMonth}/mo free=${saved.freePerMonth}/mo` });
}

export async function saveAiTiers(actor: string, free: string, pro: string, light = "default", lightForPro = false) {
  await requireAdmin(actor);
  const { TIER_CHOICES } = await import("@/lib/domain/ai-pricing");
  const pick = (id: string) => {
    const c = TIER_CHOICES.find((t) => t.id === id);
    if (!c) throw new AdminError("Unknown model.");
    return { provider: c.provider, model: c.model };
  };
  const value = { free: pick(free), pro: pick(pro), light: pick(light), lightForPro };
  await q("insert into public.app_settings (key, value) values ('ai_tiers', $1) on conflict (key) do update set value = excluded.value", [JSON.stringify(value)]);
  const { clearTierCache } = await import("@/lib/ai/client");
  clearTierCache();
  await audit(actor, "ai.tiers", { label: `free=${free} pro=${pro} light=${light}${lightForPro ? " (pro too)" : ""}` });
}

export async function aiCosts() {
  const [tot] = await q<{ cost: number; calls: number; failed: number; input: number; output: number }>(
    `select coalesce(sum(cost_usd), 0)::float8 as cost, count(*)::int as calls, count(*) filter (where not ok)::int as failed,
            coalesce(sum(input_tokens), 0)::float8 as input, coalesce(sum(output_tokens), 0)::float8 as output
       from public.ai_usage where created_at > now() - interval '30 days'`,
  );
  const daily = await q<{ d: string; cost: number; calls: number }>(
    `select to_char(d, 'YYYY-MM-DD') as d,
       coalesce((select sum(cost_usd) from public.ai_usage where created_at::date = d), 0)::float8 as cost,
       (select count(*)::int from public.ai_usage where created_at::date = d) as calls
     from generate_series(current_date - 13, current_date, interval '1 day') d order by d`,
  );
  const byFeature = await q<{ k: string; cost: number; calls: number; tokens: number }>(
    `select feature as k, sum(cost_usd)::float8 as cost, count(*)::int as calls, sum(input_tokens + output_tokens)::float8 as tokens
       from public.ai_usage where created_at > now() - interval '30 days' group by feature order by cost desc limit 15`,
  );
  const byTier = await q<{ k: string; cost: number; calls: number; users: number }>(
    `select tier as k, sum(cost_usd)::float8 as cost, count(*)::int as calls, count(distinct user_id)::int as users
       from public.ai_usage where created_at > now() - interval '30 days' group by tier order by cost desc`,
  );
  const byModel = await q<{ k: string; cost: number; calls: number }>(
    `select provider || ' · ' || model as k, sum(cost_usd)::float8 as cost, count(*)::int as calls
       from public.ai_usage where created_at > now() - interval '30 days' group by 1 order by cost desc limit 10`,
  );
  const topUsers = await q<{ id: string; name: string; cost: number; calls: number; tier: string }>(
    `select a.user_id as id, coalesce(nullif(p.display_name, ''), 'Member') as name, sum(a.cost_usd)::float8 as cost, count(*)::int as calls,
            max(a.tier) as tier
       from public.ai_usage a left join public.profiles p on p.id = a.user_id
      where a.created_at > now() - interval '30 days' and a.user_id is not null group by a.user_id, p.display_name order by cost desc limit 10`,
  );
  // Cost of one completed daily session = check-in + session AI calls / sessions completed (30 days).
  const [perSession] = await q<{ cost: number; sessions: number }>(
    `select coalesce((select sum(cost_usd) from public.ai_usage where created_at > now() - interval '30 days'
              and (feature like 'checkin.%' or feature like 'session.%')), 0)::float8 as cost,
            (select count(*)::int from public.daily_sessions where completed_at > now() - interval '30 days') as sessions`,
  );
  return { tot, daily, byFeature, byTier, byModel, topUsers, perSession };
}

/** Runs one tiny request on a model to check it is reachable, and reports time and cost. */
export async function testModel(actor: string, choiceId: string) {
  await requireAdmin(actor);
  const { TIER_CHOICES, costUSD, SESSION_TOKENS_ESTIMATE } = await import("@/lib/domain/ai-pricing");
  const c = TIER_CHOICES.find((t) => t.id === choiceId);
  if (!c) throw new AdminError("Unknown model.");
  const ai = await import("@/lib/ai/client");
  const { z } = await import("zod");
  const started = Date.now();
  try {
    const out = await ai.runWithAIContext({ userId: actor, feature: "admin.test", tier: "pro" }, () =>
      ai.generateStructured({
        system: "You are a test endpoint. Reply briefly.",
        prompt: "Return one short motivational sentence for someone starting a 90-day self-development programme.",
        schema: z.object({ sentence: z.string() }),
        effort: "low",
        maxTokens: 400,
        modelOverride: c.provider === "default" ? undefined : { kind: c.provider, model: c.model },
      }),
    );
    const [last] = await q<{ model: string; provider: string }>(
      "select model, provider from public.ai_usage where user_id = $1 and feature = 'admin.test' and ok order by id desc limit 1",
      [actor],
    );
    const used = last ? `${last.provider} · ${last.model}` : "unknown";
    return {
      ok: true as const,
      ms: Date.now() - started,
      sentence: out.sentence,
      used,
      estimateSession: c.provider === "default" ? null : costUSD(c.model, SESSION_TOKENS_ESTIMATE.input, SESSION_TOKENS_ESTIMATE.output),
    };
  } catch (err) {
    return { ok: false as const, ms: Date.now() - started, error: (err as Error).message.slice(0, 300) };
  }
}

// ---------------------------------------------------------------------------
// Sponsors
// ---------------------------------------------------------------------------

export type CampaignInput = {
  sponsorName: string;
  category: string;
  title: string;
  body: string;
  ctaLabel: string;
  url: string;
  placements: string[];
  languages: string[] | null;
  days: number | null;
  maxViews: number | null;
  weight: number;
};

export async function createCampaign(actor: string, c: CampaignInput) {
  await requireAdmin(actor);
  if (!/^https:\/\/[^\s]+$/.test(c.url)) throw new AdminError("The link must start with https://");
  await q(
    `insert into public.sponsor_campaigns (sponsor_name, category, title, body, cta_label, url, placements, languages, ends_at, max_views, weight, created_by)
     values ($1, $2, $3, $4, $5, $6, $7, $8, case when $9::int is null then null else now() + make_interval(days => $9::int) end, $10, $11, $12)`,
    [c.sponsorName, c.category, c.title, c.body, c.ctaLabel, c.url, c.placements, c.languages, c.days, c.maxViews, c.weight, actor],
  );
  await audit(actor, "sponsor.create", { label: `${c.sponsorName}: ${c.title}` });
}

export async function setCampaignActive(actor: string, id: string, active: boolean) {
  await requireAdmin(actor);
  await q("update public.sponsor_campaigns set active = $2 where id = $1", [id, active]);
  await audit(actor, active ? "sponsor.resume" : "sponsor.pause", { label: id.slice(0, 8) });
}

export async function deleteCampaign(actor: string, id: string) {
  await requireAdmin(actor);
  await q("delete from public.sponsor_campaigns where id = $1", [id]);
  await audit(actor, "sponsor.delete", { label: id.slice(0, 8) });
}

export async function listCampaigns() {
  return q<{
    id: string;
    sponsor_name: string;
    category: string;
    title: string;
    body: string;
    cta_label: string;
    url: string;
    placements: string[];
    languages: string[] | null;
    ends_at: string | null;
    max_views: number | null;
    weight: number;
    active: boolean;
    views: number;
    clicks: number;
    views_30d: number;
    clicks_30d: number;
  }>(
    `select c.*, coalesce(sum(s.views), 0)::int as views, coalesce(sum(s.clicks), 0)::int as clicks,
            coalesce(sum(s.views) filter (where s.day > current_date - 30), 0)::int as views_30d,
            coalesce(sum(s.clicks) filter (where s.day > current_date - 30), 0)::int as clicks_30d
       from public.sponsor_campaigns c left join public.sponsor_stats s on s.campaign_id = c.id
      group by c.id order by c.active desc, c.created_at desc limit 100`,
  );
}

export async function listSponsorRequests() {
  return q<{ id: string; name: string; email: string; category: string; link: string | null; budget: string | null; message: string | null; status: string; created_at: string }>(
    "select * from public.sponsor_requests order by (status = 'new') desc, created_at desc limit 100",
  );
}

export async function setSponsorRequestStatus(actor: string, id: string, status: string) {
  await requireAdmin(actor);
  await q("update public.sponsor_requests set status = $2 where id = $1", [id, status]);
}
