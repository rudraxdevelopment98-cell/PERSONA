import { describe, expect, it } from "vitest";
import { createDb } from "./query";

const capture = () => {
  const calls: { sql: string; params: unknown[] }[] = [];
  const db = createDb(async (sql, params) => {
    calls.push({ sql, params });
    return [{ id: "1", count: 3 }];
  });
  return { db, calls };
};

describe("query builder", () => {
  it("parameterises filters and quotes identifiers", async () => {
    const { db, calls } = capture();
    await db.from("journal_entries").select("id, title").eq("user_id", "u1").not("score", "is", null).order("created_at", { ascending: false }).limit(5);
    expect(calls[0].sql).toBe(
      'select "id", "title" from public."journal_entries" where "user_id" = $1 and "score" is not null order by "created_at" desc limit 5',
    );
    expect(calls[0].params).toEqual(["u1"]);
  });

  it("rejects unsafe identifiers instead of interpolating them", async () => {
    const { db, calls } = capture();
    const res = await db.from("journal_entries").select("id; drop table x").eq("user_id", "u");
    expect(res.error).not.toBeNull();
    expect(calls).toHaveLength(0);
  });

  it("serialises jsonb columns and keeps text arrays as arrays", async () => {
    const { db, calls } = capture();
    await db.from("journal_entries").insert({ user_id: "u", tags: ["a"], evaluation: [1, 2] }).select("id").single();
    expect(calls[0].sql).toBe('insert into public."journal_entries" ("user_id", "tags", "evaluation") values ($1, $2, $3::jsonb) returning "id"');
    expect(calls[0].params).toEqual(["u", ["a"], "[1,2]"]);
  });

  it("builds upserts with conflict targets and count queries", async () => {
    const { db, calls } = capture();
    await db.from("achievements").upsert([{ user_id: "u", code: "x", title: "t" }], { onConflict: "user_id,code", ignoreDuplicates: true });
    expect(calls[0].sql).toMatch(/on conflict \("user_id", "code"\) do nothing$/);
    await db.from("skill_progress").upsert({ user_id: "u", dimension: "confidence", current: 5 });
    expect(calls[1].sql).toMatch(/on conflict \("user_id", "dimension"\) do update set "current" = excluded."current"$/);
    const { count } = await db.from("decision_logs").select("id", { count: "exact", head: true }).eq("user_id", "u");
    expect(count).toBe(3);
  });

  it("supports full-text search with a bound query", async () => {
    const { db, calls } = capture();
    await db.from("journal_entries").select("*").textSearch("search", "courage' or 1=1", { type: "websearch", config: "english" });
    expect(calls[0].sql).toContain(`"search" @@ websearch_to_tsquery('english', $1)`);
    expect(calls[0].params).toEqual(["courage' or 1=1"]);
  });
});
