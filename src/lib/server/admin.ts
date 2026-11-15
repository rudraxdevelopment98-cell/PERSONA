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
}

/** Blocks sign-in and ends every session of the account. */
export async function suspendUser(actor: string, userId: string) {
  await requireAdmin(actor);
  if (actor === userId) throw new AdminError("You can't suspend yourself.");
  if (await isAdmin(userId)) throw new AdminError("Admins can't be suspended.");
  await q("update public.profiles set suspended_at = now() where id = $1", [userId]);
  await q('delete from "session" where "userId" = $1', [userId]);
}

export async function unsuspendUser(actor: string, userId: string) {
  await requireAdmin(actor);
  await q("update public.profiles set suspended_at = null where id = $1", [userId]);
}

export async function deleteCircle(actor: string, circleId: string) {
  await requireAdmin(actor);
  await q("delete from public.circles where id = $1", [circleId]);
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
