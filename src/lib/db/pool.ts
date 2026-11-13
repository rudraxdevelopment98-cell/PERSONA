import "server-only";
import pg from "pg";

// Return values in the same shapes the app expects: numbers for NUMERIC,
// ISO-8601 strings for timestamps and plain YYYY-MM-DD strings for dates.
pg.types.setTypeParser(1700, (v) => (v == null ? null : parseFloat(v)));
pg.types.setTypeParser(20, (v) => (v == null ? null : parseInt(v, 10)));
pg.types.setTypeParser(1184, (v) => (v == null ? null : new Date(v).toISOString()));
pg.types.setTypeParser(1114, (v) => (v == null ? null : new Date(`${v}Z`).toISOString()));
pg.types.setTypeParser(1082, (v) => v);

const globalForPool = globalThis as unknown as { __personaPool?: pg.Pool };

/** One shared connection pool per server instance (pooled Neon URL at runtime). */
export function getPool(): pg.Pool {
  if (!globalForPool.__personaPool) {
    globalForPool.__personaPool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return globalForPool.__personaPool;
}
