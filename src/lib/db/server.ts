import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";
import { getPool } from "./pool";
import { createDb, type Db } from "./query";

export type { Db } from "./query";

export type SessionUser = { id: string; email: string; name: string; created_at: string };

/**
 * Database access for one user. Every statement runs in its own transaction as
 * the restricted role app_user with app.user_id set, so Postgres Row Level
 * Security limits it to that user's rows.
 */
export function dbForUser(userId: string): Db {
  return createDb(async (sql, params) => {
    const client = await getPool().connect();
    try {
      await client.query("begin; set local role app_user");
      await client.query("select set_config('app.user_id', $1, true)", [userId]);
      const res = await client.query(sql, params);
      await client.query("commit");
      return res.rows;
    } catch (err) {
      await client.query("rollback").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  });
}

/** The signed-in user (verified against the session table), or null. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const u = session.user;
  return { id: u.id, email: u.email, name: u.name, created_at: new Date(u.createdAt).toISOString() };
});

/** Returns the signed-in user and their database handle, or redirects to login. */
export const requireUser = cache(async () => {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return { db: dbForUser(user.id), user };
});

/** Permanently deletes the user; every application row cascades. */
export async function deleteUserAccount(userId: string) {
  await getPool().query('delete from "user" where id = $1', [userId]);
}
