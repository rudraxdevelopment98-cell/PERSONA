import "server-only";
import { createHash, randomInt } from "node:crypto";
import { auth } from "@/lib/auth";
import { getPool } from "@/lib/db/pool";
import type { Db } from "@/lib/db/server";

/** Crockford base32 without easily confused characters (no I, L, O, U). */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const CODE_COUNT = 8;

function pepper() {
  return process.env.BETTER_AUTH_SECRET || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "";
}

export function normaliseCode(code: string): string {
  return code.toUpperCase().replace(/[^0-9A-Z]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
}

export function hashCode(code: string): string {
  return createHash("sha256").update(`persona90-recovery:${pepper()}:${normaliseCode(code)}`).digest("hex");
}

const hashValue = (label: string, v: string) => createHash("sha256").update(`persona90-${label}:${pepper()}:${v.toLowerCase().trim()}`).digest("hex");

function newCode(): string {
  let s = "";
  for (let i = 0; i < 10; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return `${s.slice(0, 5)}-${s.slice(5)}`;
}

/** Replaces the user's recovery codes with a fresh set and returns them (shown once). */
export async function generateRecoveryCodes(db: Db, userId: string): Promise<string[]> {
  const codes = Array.from({ length: CODE_COUNT }, newCode);
  await db.from("recovery_codes").delete().eq("user_id", userId);
  const { error } = await db.from("recovery_codes").insert(codes.map((c) => ({ user_id: userId, code_hash: hashCode(c) })));
  if (error) throw new Error("Could not create recovery codes.");
  return codes;
}

/**
 * Creates the first set of codes exactly once per account (a transaction-level
 * advisory lock stops concurrent requests creating two sets). Returns null if
 * the account already has codes.
 */
export async function claimInitialCodes(userId: string): Promise<string[] | null> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [`recovery:${userId}`]);
    const { rows } = await client.query("select count(*)::int as n from public.recovery_codes where user_id = $1", [userId]);
    if (rows[0].n > 0) {
      await client.query("commit");
      return null;
    }
    const codes = Array.from({ length: CODE_COUNT }, newCode);
    for (const c of codes) await client.query("insert into public.recovery_codes (user_id, code_hash) values ($1, $2)", [userId, hashCode(c)]);
    await client.query("commit");
    return codes;
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function recoveryStatus(db: Db, userId: string): Promise<{ total: number; remaining: number }> {
  const { data } = await db.from("recovery_codes").select("used_at").eq("user_id", userId);
  const rows = data ?? [];
  return { total: rows.length, remaining: rows.filter((r) => !r.used_at).length };
}

export class RecoveryError extends Error {}

const GENERIC = "That email and recovery code don't match. Check the code and try again.";

/**
 * Resets a forgotten password with a one-time recovery code. Rate limited per
 * email and per IP; on success every session for the account is signed out.
 */
export async function resetPasswordWithCode(email: string, code: string, newPassword: string, ip: string) {
  const pool = getPool();
  const emailHash = hashValue("email", email);
  const ipHash = hashValue("ip", ip || "unknown");
  const { rows: recent } = await pool.query(
    `select
       count(*) filter (where email_hash = $1)::int as by_email,
       count(*) filter (where ip_hash = $2)::int as by_ip
     from public.password_reset_attempts
     where created_at > now() - interval '1 hour' and (email_hash = $1 or ip_hash = $2)`,
    [emailHash, ipHash],
  );
  if (recent[0].by_email >= 5 || recent[0].by_ip >= 20) {
    throw new RecoveryError("Too many attempts. Please wait an hour and try again.");
  }
  await pool.query("insert into public.password_reset_attempts (email_hash, ip_hash) values ($1, $2)", [emailHash, ipHash]);

  const { rows: users } = await pool.query('select id from "user" where lower(email) = lower($1)', [email.trim()]);
  const userId: string | undefined = users[0]?.id;
  if (!userId) throw new RecoveryError(GENERIC);

  // Mark the code used atomically so it can only ever work once.
  const { rowCount } = await pool.query(
    "update public.recovery_codes set used_at = now() where user_id = $1 and code_hash = $2 and used_at is null",
    [userId, hashCode(code)],
  );
  if (!rowCount) throw new RecoveryError(GENERIC);

  const ctx = await auth.$context;
  const hashed = await ctx.password.hash(newPassword);
  const { rowCount: updated } = await pool.query(`update "account" set password = $1, "updatedAt" = now() where "userId" = $2 and "providerId" = 'credential'`, [
    hashed,
    userId,
  ]);
  if (!updated) throw new RecoveryError("This account has no password to reset.");
  await pool.query('delete from "session" where "userId" = $1', [userId]);
}
