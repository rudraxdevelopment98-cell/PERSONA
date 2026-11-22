import "server-only";
import { createHash } from "node:crypto";
import { getPool } from "@/lib/db/pool";

export type ErrorSource = "server" | "client" | "ai";

/** Strip anything that could be personal: emails, long numbers, tokens, query strings. */
export function scrub(text: string, max = 300) {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email]")
    .replace(/\b[A-Za-z0-9_-]{24,}\b/g, "[token]")
    .replace(/\b\d{6,}\b/g, "[n]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

const path = (loc: string) => scrub(loc.split("?")[0].replace(/\/[0-9a-f-]{36}/gi, "/:id").replace(/\/i\/[^/]+/, "/i/:token"), 120);

/** Records an error (grouped per hour). Never throws: monitoring must not break the app. */
export async function logError(source: ErrorSource, location: string, err: unknown, userId?: string | null) {
  try {
    if (source === "client") {
      // Browser reports are public: cap how many distinct ones an hour can add.
      const { rows } = await getPool().query<{ n: number }>("select count(*)::int as n from public.app_errors where bucket = date_trunc('hour', now()) and source = 'client'");
      if (rows[0].n >= 300) return;
    }
    const msg = scrub(err instanceof Error ? `${err.name}: ${err.message}` : String(err));
    const loc = path(location);
    const fingerprint = createHash("sha1").update(`${source}|${loc}|${msg.replace(/\d+/g, "#")}`).digest("hex").slice(0, 20);
    await getPool().query(
      `insert into public.app_errors (fingerprint, bucket, source, location, message, users)
       values ($1, date_trunc('hour', now()), $2, $3, $4, $5)
       on conflict (fingerprint, bucket) do update set count = public.app_errors.count + 1, last_seen = now(),
         users = public.app_errors.users + excluded.users, message = excluded.message`,
      [fingerprint, source, loc, msg, userId ? 1 : 0],
    );
  } catch (e) {
    console.warn("[errors] could not record", (e as Error).message);
  }
}

export async function errorSummary(hours: number) {
  const { rows } = await getPool().query<{ fingerprint: string; source: ErrorSource; location: string; message: string; count: number; last_seen: string }>(
    `select fingerprint, min(source) as source, min(location) as location, max(message) as message, sum(count)::int as count, max(last_seen) as last_seen
       from public.app_errors where bucket > now() - make_interval(hours => $1)
      group by fingerprint order by count desc, last_seen desc limit 50`,
    [hours],
  );
  const { rows: hourly } = await getPool().query<{ h: string; n: number }>(
    `select to_char(b, 'HH24') as h, coalesce((select sum(count) from public.app_errors e where e.bucket = b), 0)::int as n
       from generate_series(date_trunc('hour', now()) - interval '23 hours', date_trunc('hour', now()), interval '1 hour') b order by b`,
  );
  return { rows, hourly };
}

/** Hourly job: tell admins when errors spike (20+ in the last hour), at most once every 6 hours. */
export async function checkErrorSpike() {
  const pool = getPool();
  const { rows: [r] } = await pool.query<{ n: number; top: string | null }>(
    `select coalesce(sum(count), 0)::int as n,
       (select message from public.app_errors where last_seen > now() - interval '1 hour' order by count desc limit 1) as top
       from public.app_errors where last_seen > now() - interval '1 hour'`,
  );
  if (r.n < 20) return { errors: r.n, alerted: false };
  const { rows: [last] } = await pool.query<{ value: { at: string } }>("select value from public.app_settings where key = 'error_alert'");
  if (last && Date.now() - Date.parse(last.value.at) < 6 * 3_600_000) return { errors: r.n, alerted: false };
  await pool.query("insert into public.app_settings (key, value) values ('error_alert', $1) on conflict (key) do update set value = excluded.value", [
    JSON.stringify({ at: new Date().toISOString() }),
  ]);
  const { rows: admins } = await pool.query<{ user_id: string }>("select user_id from public.admins");
  const { notify } = await import("./social");
  await Promise.all(
    admins.map((a) =>
      notify(a.user_id, "error_alert", { title: `⚠️ ${r.n} errors in the last hour`, body: (r.top ?? "").slice(0, 140), url: "/admin/errors" }).catch(() => {}),
    ),
  );
  return { errors: r.n, alerted: true };
}
