import "server-only";
import { getPool } from "@/lib/db/pool";
import { DEFAULT_LEGAL, LEGAL_VERSION, isEmail, type LegalSettings } from "@/lib/domain/legal";

const q = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => (await getPool().query(sql, params)).rows as T[];

/** Business name and grievance contact shown on the legal pages (set in Admin → Plans). */
export async function legalSettings(): Promise<LegalSettings> {
  const [r] = await q<{ value: Partial<LegalSettings> }>("select value from public.app_settings where key = 'legal'");
  return { ...DEFAULT_LEGAL, ...(r?.value ?? {}) };
}

export function cleanLegal(raw: Partial<Record<keyof LegalSettings, unknown>>): LegalSettings | string {
  const s = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
  const out: LegalSettings = { business: s(raw.business, 80) || DEFAULT_LEGAL.business, email: s(raw.email, 200), grievanceName: s(raw.grievanceName, 80), city: s(raw.city, 80) || DEFAULT_LEGAL.city };
  if (out.email && !isEmail(out.email)) return "Enter a valid contact email.";
  return out;
}

export async function hasAcceptedLegal(userId: string): Promise<boolean> {
  const rows = await q("select 1 from public.consents where user_id = $1 and kind = 'terms' and version = $2", [userId, LEGAL_VERSION]);
  return rows.length > 0;
}

/** Records agreement to the current Terms + Privacy Policy and the 18+ confirmation. */
export async function acceptLegal(userId: string) {
  await q(
    `insert into public.consents (user_id, kind, version) select $1, k, $2 from unnest(array['terms', 'privacy', 'age18']) as k
     on conflict (user_id, kind, version) do nothing`,
    [userId, LEGAL_VERSION],
  );
}
