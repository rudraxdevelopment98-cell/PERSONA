// Applies db/migrations/*.sql in order, once each. Runs automatically before
// `next build` so every deploy brings the database schema up to date.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.log("[migrate] DATABASE_URL not set - skipping migrations.");
  process.exit(0);
}

const dir = path.join(process.cwd(), "db", "migrations");
const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query("select pg_advisory_lock(907090)");
  await client.query("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())");
  const { rows } = await client.query("select name from schema_migrations");
  const applied = new Set(rows.map((r) => r.name));
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(path.join(dir, file), "utf8");
    console.log(`[migrate] applying ${file}`);
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("insert into schema_migrations (name) values ($1)", [file]);
      await client.query("commit");
    } catch (err) {
      await client.query("rollback");
      throw err;
    }
  }
  console.log("[migrate] database is up to date.");
} finally {
  await client.query("select pg_advisory_unlock(907090)").catch(() => {});
  await client.end();
}
