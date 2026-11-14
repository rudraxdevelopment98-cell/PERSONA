import "server-only";
import webpush from "web-push";
import { getPool } from "@/lib/db/pool";

/**
 * Web Push with keys the app generates for itself on first use and stores in
 * the database - free, no third-party service or configuration needed.
 */
let cached: { publicKey: string; privateKey: string } | null = null;

export async function vapidKeys() {
  if (cached) return cached;
  const pool = getPool();
  const { rows } = await pool.query("select value from public.app_settings where key = 'vapid'");
  if (rows[0]) {
    cached = rows[0].value;
    return cached!;
  }
  const keys = webpush.generateVAPIDKeys();
  // If two instances race, keep whichever was stored first.
  await pool.query("insert into public.app_settings (key, value) values ('vapid', $1) on conflict (key) do nothing", [JSON.stringify(keys)]);
  const again = await pool.query("select value from public.app_settings where key = 'vapid'");
  cached = again.rows[0].value;
  return cached!;
}

export async function saveSubscription(userId: string, sub: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  await getPool().query(
    `insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values ($1, $2, $3, $4)
     on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth`,
    [userId, sub.endpoint, sub.keys.p256dh, sub.keys.auth],
  );
}

export async function removeSubscription(userId: string, endpoint: string) {
  await getPool().query("delete from public.push_subscriptions where user_id = $1 and endpoint = $2", [userId, endpoint]);
}

/** Sends a push to every device of the user. Failures never break the calling action. */
export async function sendPush(userId: string, payload: { title: string; body: string; url: string }) {
  try {
    const pool = getPool();
    const { rows } = await pool.query("select endpoint, p256dh, auth from public.push_subscriptions where user_id = $1", [userId]);
    if (rows.length === 0) return;
    const keys = await vapidKeys();
    const subject = `mailto:noreply@${(process.env.VERCEL_PROJECT_PRODUCTION_URL || "persona90.app").replace(/^https?:\/\//, "")}`;
    await Promise.all(
      rows.map(async (r) => {
        try {
          await webpush.sendNotification({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } }, JSON.stringify(payload), {
            vapidDetails: { subject, publicKey: keys.publicKey, privateKey: keys.privateKey },
            TTL: 60 * 60 * 24,
          });
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          // The browser unsubscribed or the subscription expired.
          if (status === 404 || status === 410) await pool.query("delete from public.push_subscriptions where endpoint = $1", [r.endpoint]);
        }
      }),
    );
  } catch (err) {
    console.warn("[push] send failed", (err as Error).message);
  }
}
