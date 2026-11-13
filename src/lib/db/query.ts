/**
 * A small, parameterised query builder covering the subset of the
 * Supabase-style API this app uses (select / insert / update / upsert /
 * delete with eq, gte, not-null, full-text search, order, limit, single).
 *
 * Identifiers are validated against a strict pattern and quoted; every value
 * is sent as a bind parameter, so user input never reaches the SQL text.
 */

export type DbError = { message: string; code?: string };
export type DbResult<T> = { data: T | null; error: DbError | null; count: number | null };
export type Exec = (sql: string, params: unknown[]) => Promise<Record<string, unknown>[]>;

const IDENT = /^[a-z_][a-z0-9_]*$/i;

function ident(name: string): string {
  const n = name.trim();
  if (!IDENT.test(n)) throw new Error(`Invalid identifier: ${name}`);
  return `"${n}"`;
}

function columnList(cols: string): string {
  const c = cols.trim();
  if (c === "*") return "*";
  return c.split(",").map(ident).join(", ");
}

// jsonb columns must be serialised explicitly; otherwise node-postgres would
// turn JS arrays into Postgres array literals.
const JSON_COLUMNS = new Set([
  "questions",
  "answers",
  "analysis",
  "introduction",
  "scenarios",
  "challenge",
  "reflection_questions",
  "reflection_answers",
  "reflection_feedback",
  "insights",
  "scenario",
  "evaluation",
  "prompt",
  "scores",
  "reflections",
  "development_profile",
  "roadmap",
]);

const PRIMARY_KEYS: Record<string, string[]> = { skill_progress: ["user_id", "dimension"], profiles: ["id"] };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any;

type Filter = { sql: (p: (v: unknown) => string) => string };

export class Query<T = Row[]> implements PromiseLike<DbResult<T>> {
  private op: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private columns = "*";
  private countOnly = false;
  private returning: string | null = null;
  private filters: Filter[] = [];
  private orders: string[] = [];
  private limitN: number | null = null;
  private singleMode: "single" | "maybe" | null = null;
  private rows: Record<string, unknown>[] = [];
  private conflict: string[] | null = null;
  private ignoreDuplicates = false;

  constructor(
    private readonly exec: Exec,
    private readonly table: string,
  ) {
    ident(table);
  }

  select(cols = "*", opts?: { count?: "exact"; head?: boolean }) {
    if (this.op === "select") {
      this.columns = cols;
      this.countOnly = Boolean(opts?.count && opts?.head);
    } else {
      this.returning = cols;
    }
    return this;
  }

  insert(values: Record<string, unknown> | Record<string, unknown>[]) {
    this.op = "insert";
    this.rows = Array.isArray(values) ? values : [values];
    return this;
  }

  update(values: Record<string, unknown>) {
    this.op = "update";
    this.rows = [values];
    return this;
  }

  upsert(values: Record<string, unknown> | Record<string, unknown>[], opts?: { onConflict?: string; ignoreDuplicates?: boolean }) {
    this.op = "upsert";
    this.rows = Array.isArray(values) ? values : [values];
    this.conflict = opts?.onConflict ? opts.onConflict.split(",").map((s) => s.trim()) : (PRIMARY_KEYS[this.table] ?? ["id"]);
    this.ignoreDuplicates = Boolean(opts?.ignoreDuplicates);
    return this;
  }

  delete() {
    this.op = "delete";
    return this;
  }

  eq(col: string, value: unknown) {
    const c = ident(col);
    this.filters.push({ sql: (p) => `${c} = ${p(value)}` });
    return this;
  }

  gte(col: string, value: unknown) {
    const c = ident(col);
    this.filters.push({ sql: (p) => `${c} >= ${p(value)}` });
    return this;
  }

  not(col: string, operator: "is", value: null) {
    if (operator !== "is" || value !== null) throw new Error("Only not(col, 'is', null) is supported");
    const c = ident(col);
    this.filters.push({ sql: () => `${c} is not null` });
    return this;
  }

  textSearch(col: string, query: string, opts?: { type?: "websearch"; config?: string }) {
    const c = ident(col);
    const config = !opts?.config || opts.config === "english" ? "english" : "simple";
    this.filters.push({ sql: (p) => `${c} @@ websearch_to_tsquery('${config}', ${p(query)})` });
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.orders.push(`${ident(col)} ${opts?.ascending === false ? "desc" : "asc"}`);
    return this;
  }

  limit(n: number) {
    this.limitN = Math.max(0, Math.floor(n));
    return this;
  }

  single(): Query<Row> {
    this.singleMode = "single";
    return this as unknown as Query<Row>;
  }

  maybeSingle(): Query<Row> {
    this.singleMode = "maybe";
    return this as unknown as Query<Row>;
  }

  /** Exposed for tests. */
  toSQL(): { sql: string; params: unknown[] } {
    return this.build();
  }

  private build(): { sql: string; params: unknown[] } {
    const params: unknown[] = [];
    const p = (v: unknown) => {
      params.push(v);
      return `$${params.length}`;
    };
    const where = this.filters.length ? ` where ${this.filters.map((f) => f.sql(p)).join(" and ")}` : "";
    const t = `public.${ident(this.table)}`;
    const value = (col: string, v: unknown) => (v !== null && JSON_COLUMNS.has(col) ? `${p(JSON.stringify(v))}::jsonb` : p(v));
    const ret = this.returning != null ? ` returning ${columnList(this.returning)}` : "";

    switch (this.op) {
      case "select": {
        if (this.countOnly) return { sql: `select count(*)::int as count from ${t}${where}`, params };
        const order = this.orders.length ? ` order by ${this.orders.join(", ")}` : "";
        const limit = this.limitN != null ? ` limit ${this.limitN}` : "";
        return { sql: `select ${columnList(this.columns)} from ${t}${where}${order}${limit}`, params };
      }
      case "insert":
      case "upsert": {
        const cols = [...new Set(this.rows.flatMap((r) => Object.keys(r).filter((k) => r[k] !== undefined)))];
        if (cols.length === 0) throw new Error("Nothing to insert");
        const tuples = this.rows.map((r) => `(${cols.map((c) => (r[c] === undefined ? "default" : value(c, r[c]))).join(", ")})`);
        let sql = `insert into ${t} (${cols.map(ident).join(", ")}) values ${tuples.join(", ")}`;
        if (this.op === "upsert") {
          const conflict = this.conflict!;
          const target = conflict.map(ident).join(", ");
          const updates = cols.filter((c) => !conflict.includes(c));
          sql +=
            this.ignoreDuplicates || updates.length === 0
              ? ` on conflict (${target}) do nothing`
              : ` on conflict (${target}) do update set ${updates.map((c) => `${ident(c)} = excluded.${ident(c)}`).join(", ")}`;
        }
        return { sql: sql + ret, params };
      }
      case "update": {
        const entries = Object.entries(this.rows[0]).filter(([, v]) => v !== undefined);
        if (entries.length === 0) throw new Error("Nothing to update");
        const set = entries.map(([c, v]) => `${ident(c)} = ${value(c, v)}`).join(", ");
        return { sql: `update ${t} set ${set}${where}${ret}`, params };
      }
      case "delete":
        return { sql: `delete from ${t}${where}${ret}`, params };
    }
  }

  private async run(): Promise<DbResult<T>> {
    try {
      const { sql, params } = this.build();
      const rows = await this.exec(sql, params);
      if (this.countOnly) return { data: null, error: null, count: Number(rows[0]?.count ?? 0) };
      if (this.op !== "select" && this.returning == null) return { data: null, error: null, count: null };
      if (this.singleMode) {
        if (rows.length > 1) return { data: null, error: { message: "Multiple rows returned", code: "PGRST116" }, count: null };
        if (rows.length === 0) {
          return this.singleMode === "maybe"
            ? { data: null, error: null, count: null }
            : { data: null, error: { message: "No rows returned", code: "PGRST116" }, count: null };
        }
        return { data: rows[0] as T, error: null, count: null };
      }
      return { data: rows as T, error: null, count: null };
    } catch (err) {
      const e = err as { message?: string; code?: string };
      return { data: null, error: { message: e.message ?? "Database error", code: e.code }, count: null };
    }
  }

  then<R1 = DbResult<T>, R2 = never>(
    onfulfilled?: ((value: DbResult<T>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return this.run().then(onfulfilled, onrejected);
  }
}

export type Db = { from: (table: string) => Query };

export function createDb(exec: Exec): Db {
  return { from: (table: string) => new Query(exec, table) };
}
