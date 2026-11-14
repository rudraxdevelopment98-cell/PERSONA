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


// ---------------------------------------------------------------------------
// Backup: security questions written by the user
// ---------------------------------------------------------------------------

export function normaliseAnswer(a: string): string {
  return a.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export async function saveSecurityQuestions(db: Db, userId: string, q: { q1: string; a1: string; q2: string; a2: string }) {
  const ctx = await auth.$context;
  const [h1, h2] = await Promise.all([ctx.password.hash(normaliseAnswer(q.a1)), ctx.password.hash(normaliseAnswer(q.a2))]);
  const { error } = await db.from("security_questions").upsert(
    { user_id: userId, question_1: q.q1.trim(), answer_1_hash: h1, question_2: q.q2.trim(), answer_2_hash: h2, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  if (error) throw new Error("Could not save your security questions.");
}

export async function securityQuestionsSet(db: Db, userId: string): Promise<{ q1: string; q2: string } | null> {
  const { data } = await db.from("security_questions").select("question_1, question_2").eq("user_id", userId).maybeSingle();
  return data ? { q1: data.question_1, q2: data.question_2 } : null;
}

const DECOYS: [string, string][] = [
  ["What was the name of your first school?", "Which city would you most like to live in?"],
  ["What was your childhood nickname?", "What is the name of your favourite teacher?"],
  ["What was the first film you saw in a cinema?", "What street did you grow up on?"],
  ["What was the model of your first phone?", "What is your favourite childhood book?"],
];

/**
 * The questions to show for an email. Unknown emails get stable decoy
 * questions, so the page never reveals whether an account exists.
 */
export async function questionsForEmail(email: string): Promise<{ q1: string; q2: string }> {
  const { rows } = await getPool().query(
    'select q.question_1, q.question_2 from public.security_questions q join "user" u on u.id = q.user_id where lower(u.email) = lower($1)',
    [email.trim()],
  );
  if (rows[0]) return { q1: rows[0].question_1, q2: rows[0].question_2 };
  const pick = DECOYS[parseInt(hashValue("decoy", email).slice(0, 8), 16) % DECOYS.length];
  return { q1: pick[0], q2: pick[1] };
}

/** Resets the password if both answers match. 3 attempts per account per day, 10 per IP per hour. */
export async function resetPasswordWithAnswers(email: string, a1: string, a2: string, newPassword: string, ip: string) {
  const pool = getPool();
  const emailHash = hashValue("email", email);
  const ipHash = hashValue("ip", ip || "unknown");
  const { rows: recent } = await pool.query(
    `select
       count(*) filter (where email_hash = $1 and created_at > now() - interval '24 hours')::int as by_email,
       count(*) filter (where ip_hash = $2 and created_at > now() - interval '1 hour')::int as by_ip
     from public.password_reset_attempts
     where method = 'questions' and created_at > now() - interval '24 hours' and (email_hash = $1 or ip_hash = $2)`,
    [emailHash, ipHash],
  );
  if (recent[0].by_email >= 3 || recent[0].by_ip >= 10) {
    throw new RecoveryError("Too many attempts. For your security, try again in 24 hours or use a recovery code.");
  }
  await pool.query("insert into public.password_reset_attempts (email_hash, ip_hash, method) values ($1, $2, 'questions')", [emailHash, ipHash]);

  const fail = "Those answers don't match. Check spelling and try again.";
  const { rows } = await pool.query(
    'select u.id, q.answer_1_hash, q.answer_2_hash from public.security_questions q join "user" u on u.id = q.user_id where lower(u.email) = lower($1)',
    [email.trim()],
  );
  const ctx = await auth.$context;
  if (!rows[0]) {
    // Spend comparable time for unknown accounts.
    await ctx.password.hash(normaliseAnswer(a1));
    throw new RecoveryError(fail);
  }
  const [ok1, ok2] = await Promise.all([
    ctx.password.verify({ hash: rows[0].answer_1_hash, password: normaliseAnswer(a1) }),
    ctx.password.verify({ hash: rows[0].answer_2_hash, password: normaliseAnswer(a2) }),
  ]);
  if (!ok1 || !ok2) throw new RecoveryError(fail);

  const userId: string = rows[0].id;
  const hashed = await ctx.password.hash(newPassword);
  const { rowCount } = await pool.query(`update "account" set password = $1, "updatedAt" = now() where "userId" = $2 and "providerId" = 'credential'`, [hashed, userId]);
  if (!rowCount) throw new RecoveryError("This account has no password to reset.");
  await pool.query('delete from "session" where "userId" = $1', [userId]);
}
