import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getPool } from "@/lib/db/pool";
import { decryptSecret, encryptSecret, keyHint } from "./crypto";

/**
 * Payments via Paddle (Merchant of Record: it charges the buyer in their
 * currency, handles sales tax/VAT worldwide and pays out to the seller).
 * Keys are entered by an admin in the app and stored in app_settings; the
 * secret ones encrypted. Nothing is charged until they are configured.
 */

const q = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => (await getPool().query(sql, params)).rows as T[];

type Stored = {
  env: "sandbox" | "production";
  clientToken: string;
  priceMonth: string;
  priceYear: string;
  apiKeyEnc?: string;
  apiKeyHint?: string;
  webhookSecretEnc?: string;
  webhookHint?: string;
};

export type PublicPaymentConfig = { enabled: boolean; env: "sandbox" | "production"; clientToken: string; priceMonth: string; priceYear: string };

async function stored(): Promise<Stored | null> {
  const [r] = await q<{ value: Stored }>("select value from public.app_settings where key = 'payments'");
  return r?.value ?? null;
}

export async function publicConfig(): Promise<PublicPaymentConfig> {
  const s = await stored();
  return {
    enabled: Boolean(s?.clientToken && s.priceMonth && s.webhookSecretEnc),
    env: s?.env ?? "sandbox",
    clientToken: s?.clientToken ?? "",
    priceMonth: s?.priceMonth ?? "",
    priceYear: s?.priceYear ?? "",
  };
}

/** What the admin screen shows (secrets only as hints). */
export async function adminConfig() {
  const s = await stored();
  return {
    env: s?.env ?? "sandbox",
    clientToken: s?.clientToken ?? "",
    priceMonth: s?.priceMonth ?? "",
    priceYear: s?.priceYear ?? "",
    apiKeyHint: s?.apiKeyHint ?? null,
    webhookHint: s?.webhookHint ?? null,
  };
}

export async function saveConfig(input: { env: "sandbox" | "production"; clientToken: string; priceMonth: string; priceYear: string; apiKey?: string; webhookSecret?: string }) {
  const prev = (await stored()) ?? ({} as Partial<Stored>);
  const next: Stored = {
    env: input.env,
    clientToken: input.clientToken.trim(),
    priceMonth: input.priceMonth.trim(),
    priceYear: input.priceYear.trim(),
    apiKeyEnc: input.apiKey ? encryptSecret(input.apiKey.trim()) : prev.apiKeyEnc,
    apiKeyHint: input.apiKey ? keyHint(input.apiKey.trim()) : prev.apiKeyHint,
    webhookSecretEnc: input.webhookSecret ? encryptSecret(input.webhookSecret.trim()) : prev.webhookSecretEnc,
    webhookHint: input.webhookSecret ? keyHint(input.webhookSecret.trim()) : prev.webhookHint,
  };
  await q("insert into public.app_settings (key, value) values ('payments', $1) on conflict (key) do update set value = excluded.value", [JSON.stringify(next)]);
}

/** Paddle-Signature: "ts=<unix>;h1=<hex hmac-sha256 of `${ts}:${rawBody}`>". */
export function verifySignature(raw: string, header: string | null, secret: string, toleranceSec = 300): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(";").map((p) => p.split("=") as [string, string]));
  const ts = Number(parts.ts);
  if (!ts || !parts.h1 || Math.abs(Date.now() / 1000 - ts) > toleranceSec) return false;
  const expected = createHmac("sha256", secret).update(`${parts.ts}:${raw}`).digest();
  const given = Buffer.from(parts.h1, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function webhookSecret(): Promise<string | null> {
  const s = await stored();
  return s?.webhookSecretEnc ? decryptSecret(s.webhookSecretEnc) : null;
}

type PaddleSub = {
  id: string;
  status: "active" | "trialing" | "past_due" | "paused" | "canceled";
  customer_id?: string;
  custom_data?: { user_id?: string } | null;
  current_billing_period?: { ends_at?: string } | null;
  billing_cycle?: { interval?: "month" | "year" } | null;
  scheduled_change?: { action?: string; effective_at?: string } | null;
  canceled_at?: string | null;
};

/** Stores the event once and applies subscription changes. Returns false for duplicates. */
export async function handleEvent(event: { event_id: string; event_type: string; data: unknown }): Promise<boolean> {
  const ins = await getPool().query("insert into public.payment_events (id, type, payload) values ($1, $2, $3) on conflict (id) do nothing", [
    event.event_id,
    event.event_type,
    JSON.stringify(event),
  ]);
  if (!ins.rowCount) return false;
  if (!event.event_type.startsWith("subscription.")) return true;

  const sub = event.data as PaddleSub;
  let userId = sub.custom_data?.user_id ?? null;
  if (!userId) {
    const [r] = await q<{ user_id: string }>("select user_id from public.subscriptions where provider_subscription_id = $1", [sub.id]);
    userId = r?.user_id ?? null;
  }
  if (!userId) return true;
  const [exists] = await q('select 1 from "user" where id = $1', [userId]);
  if (!exists) return true;

  const cancelAt = sub.scheduled_change?.action === "cancel" ? (sub.scheduled_change.effective_at ?? null) : null;
  const periodEnd = sub.status === "canceled" ? (sub.canceled_at ?? new Date().toISOString()) : (sub.current_billing_period?.ends_at ?? null);
  await q(
    `insert into public.subscriptions (user_id, status, source, provider_customer_id, provider_subscription_id, billing_cycle, current_period_end, cancel_at, updated_at)
     values ($1, $2, 'paddle', $3, $4, $5, $6, $7, now())
     on conflict (user_id) do update set status = excluded.status, source = 'paddle', provider_customer_id = excluded.provider_customer_id,
       provider_subscription_id = excluded.provider_subscription_id, billing_cycle = excluded.billing_cycle,
       current_period_end = excluded.current_period_end, cancel_at = excluded.cancel_at, updated_at = now()`,
    [userId, sub.status, sub.customer_id ?? null, sub.id, sub.billing_cycle?.interval ?? null, periodEnd, cancelAt],
  );
  return true;
}

/** A link to Paddle's customer portal (manage card, cancel, invoices). Needs the API key. */
export async function portalUrl(userId: string): Promise<string | null> {
  const s = await stored();
  const [sub] = await q<{ provider_customer_id: string | null; provider_subscription_id: string | null }>(
    "select provider_customer_id, provider_subscription_id from public.subscriptions where user_id = $1 and source = 'paddle'",
    [userId],
  );
  if (!s?.apiKeyEnc || !sub?.provider_customer_id) return null;
  const base = s.env === "production" ? "https://api.paddle.com" : "https://sandbox-api.paddle.com";
  const res = await fetch(`${base}/customers/${encodeURIComponent(sub.provider_customer_id)}/portal-sessions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${decryptSecret(s.apiKeyEnc)}`, "Content-Type": "application/json" },
    body: JSON.stringify(sub.provider_subscription_id ? { subscription_ids: [sub.provider_subscription_id] } : {}),
  });
  if (!res.ok) return null;
  const json = (await res.json().catch(() => null)) as { data?: { urls?: { general?: { overview?: string } } } } | null;
  return json?.data?.urls?.general?.overview ?? null;
}

export async function revenueStats() {
  const bySource = await q<{ source: string; n: number }>(
    `select source, count(*)::int as n from public.subscriptions
      where status in ('active', 'trialing', 'past_due') and (current_period_end is null or current_period_end > now()) group by source order by n desc`,
  );
  const [paid] = await q<{ month: number; year: number }>(
    `select count(*) filter (where billing_cycle = 'month')::int as month, count(*) filter (where billing_cycle = 'year')::int as year
       from public.subscriptions where source = 'paddle' and status in ('active', 'past_due')`,
  );
  return { bySource, paid };
}
