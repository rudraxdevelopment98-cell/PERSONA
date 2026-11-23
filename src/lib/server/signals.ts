import "server-only";
import { getPool } from "@/lib/db/pool";
import { generateStructured, runWithAIContext } from "@/lib/ai/client";
import { DIMENSIONS, type Dimension } from "@/lib/domain/dimensions";
import {
  RAW_TEXT_HOURS,
  RAW_TEXT_MAX_DAYS,
  SIGNALS_SYSTEM,
  buildProfile,
  cleanSignal,
  signalBatchSchema,
  type PersonaProfile,
  type Signal,
  type SignalEvent,
  type SignalSource,
} from "@/lib/domain/signals";

/**
 * Turns people's own words into private persona signals, then wipes the words.
 *
 *   1. extractPending(): new text (still inside the short window) -> closed-vocabulary
 *      signals, one AI call per user batch.
 *   2. redactOld(): text older than RAW_TEXT_HOURS is wiped once its signals exist,
 *      and after RAW_TEXT_MAX_DAYS no matter what.
 *   3. rebuildProfile(): persona profile recomputed from signals + skill scores.
 *
 * The journal is the person's own diary: never read here and never wiped.
 */

const q = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => (await getPool().query(sql, params)).rows as T[];
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) : s);

type Item = { user_id: string; source: SignalSource; ref_id: string; text: string };

const NO_SIGNAL = (src: string, alias: string) =>
  `not exists (select 1 from public.signal_events e where e.source = '${src}' and e.ref_id = ${alias}.id::text)`;
const RECENT = (col: string) => `${col} > now() - interval '${RAW_TEXT_MAX_DAYS} days'`;

/** Text items that have no signals yet, newest first. */
async function pendingItems(limit: number, userId?: string): Promise<Item[]> {
  const who = userId ? "and x.user_id = $2" : "";
  const p = userId ? [limit, userId] : [limit];
  const out: Item[] = [];

  const checkins = await q<{ id: string; user_id: string; questions: { id: string; text: string; type?: string }[]; answers: { id: string; value: unknown }[] | null; today_note: string | null }>(
    `select x.id::text, x.user_id, x.questions, x.answers, x.today_note from public.daily_checkins x
      where x.completed_at is not null and x.redacted_at is null and ${RECENT("x.completed_at")} and ${NO_SIGNAL("checkin", "x")} ${who}
      order by x.completed_at desc limit $1`,
    p,
  );
  for (const c of checkins) {
    const qa = (c.answers ?? [])
      .map((a) => {
        const qn = c.questions.find((x) => x.id === a.id);
        return typeof a.value === "string" && a.value.trim() && (qn?.type ?? "text") === "text" ? `Q: ${qn?.text ?? ""}\nA: ${a.value}` : null;
      })
      .filter(Boolean);
    if (c.today_note) qa.push(`What happened today: ${c.today_note}`);
    if (qa.length) out.push({ user_id: c.user_id, source: "checkin", ref_id: c.id, text: qa.join("\n") });
  }

  const sessions = await q<{ id: string; user_id: string; reflection_answers: string[] | null; challenge_notes: string | null; rq: unknown }>(
    `select x.id::text, x.user_id, x.reflection_answers, x.challenge_notes, x.reflection_questions as rq from public.daily_sessions x
      where x.redacted_at is null and ${RECENT("x.created_at")} and (x.reflection_answers is not null or x.challenge_notes is not null)
        and (${NO_SIGNAL("reflection", "x")} or ${NO_SIGNAL("challenge", "x")}) ${who}
      order by x.created_at desc limit $1`,
    p,
  );
  const sessionDone = new Set(
    sessions.length
      ? (await q<{ k: string }>("select source || ':' || ref_id as k from public.signal_events where ref_id = any($1) and source in ('reflection', 'challenge')", [sessions.map((s) => s.id)])).map((r) => r.k)
      : [],
  );
  for (const s of sessions) {
    const refl = (s.reflection_answers ?? []).filter((a) => a && a.trim());
    if (refl.length && !sessionDone.has(`reflection:${s.id}`)) out.push({ user_id: s.user_id, source: "reflection", ref_id: s.id, text: refl.join("\n") });
    if (s.challenge_notes?.trim() && !sessionDone.has(`challenge:${s.id}`)) out.push({ user_id: s.user_id, source: "challenge", ref_id: s.id, text: `Real-life challenge notes: ${s.challenge_notes}` });
  }

  const simple: [SignalSource, string, string, string][] = [
    ["story_line", "generated_stories", "user_line", "created_at"],
    ["scenario", "scenario_responses", "reasoning", "created_at"],
    ["decision", "decision_logs", "reasoning", "created_at"],
    ["communication", "exercise_completions", "response", "created_at"],
  ];
  for (const [source, table, col, at] of simple) {
    const rows = await q<{ id: string; user_id: string; t: string }>(
      `select x.id::text, x.user_id, x.${col} as t from public.${table} x
        where x.redacted_at is null and coalesce(x.${col}, '') <> '' and ${RECENT(`x.${at}`)} and ${NO_SIGNAL(source, "x")} ${who}
        order by x.${at} desc limit $1`,
      p,
    );
    for (const r of rows) out.push({ user_id: r.user_id, source, ref_id: r.id, text: r.t });
  }

  const coach = await q<{ id: string; user_id: string; content: string }>(
    `select x.id::text, x.user_id, x.content from public.coach_messages x
      where x.role = 'user' and ${RECENT("x.created_at")} and ${NO_SIGNAL("coach", "x")} ${who}
      order by x.created_at desc limit $1`,
    p,
  );
  for (const c of coach) out.push({ user_id: c.user_id, source: "coach", ref_id: c.id, text: c.content });

  const assessments = await q<{ id: string; user_id: string; reflections: { held_back?: string; goal?: string } | null }>(
    `select x.id::text, x.user_id, x.reflections from public.assessments x
      where x.status = 'completed' and x.redacted_at is null and x.reflections is not null and ${RECENT("x.completed_at")} and ${NO_SIGNAL("assessment", "x")} ${who}
      order by x.completed_at desc limit $1`,
    p,
  );
  for (const a of assessments) {
    const t = [a.reflections?.held_back && `A time I held back: ${a.reflections.held_back}`, a.reflections?.goal && `My 90-day goal: ${a.reflections.goal}`].filter(Boolean).join("\n");
    if (t) out.push({ user_id: a.user_id, source: "assessment", ref_id: a.id, text: t });
  }
  return out;
}

async function saveSignal(it: Item, raw: Signal) {
  const s = cleanSignal(raw);
  await q(
    `insert into public.signal_events (user_id, source, ref_id, life_area, roles, emotions, themes, patterns, decision_style, stress, confidence, mood, skills)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) on conflict (source, ref_id) do nothing`,
    [it.user_id, it.source, it.ref_id, s.life_area, s.roles, s.emotions, s.themes, s.patterns, s.decision_style, s.stress, s.confidence, s.mood, JSON.stringify(s.skills ?? {})],
  );
}

/** Extracts signals for pending text. One AI call per user per batch of up to 8 items. */
export async function extractPending(opts: { limit?: number; userId?: string } = {}): Promise<{ items: number; saved: number; failed: number }> {
  const items = await pendingItems(opts.limit ?? 60, opts.userId);
  const byUser = new Map<string, Item[]>();
  for (const it of items) byUser.set(it.user_id, [...(byUser.get(it.user_id) ?? []), it]);
  let saved = 0;
  let failed = 0;
  const touched = new Set<string>();
  for (const [userId, list] of byUser) {
    for (let i = 0; i < list.length; i += 8) {
      const batch = list.slice(i, i + 8);
      try {
        const out = await runWithAIContext({ userId, feature: "signals.extract", tier: "free" }, () =>
          generateStructured({
            system: SIGNALS_SYSTEM,
            prompt: batch.map((b, n) => `### Text ${n + 1} (${b.source})\n${clip(b.text, 2500)}`).join("\n\n"),
            schema: signalBatchSchema,
            effort: "low",
            maxTokens: 400 * batch.length + 200,
            language: "en",
          }),
        );
        for (let n = 0; n < batch.length; n++) {
          const s = out.items[n];
          if (!s) continue;
          await saveSignal(batch[n], s);
          saved++;
        }
        touched.add(userId);
      } catch (err) {
        failed += batch.length;
        console.warn("[signals] extraction failed:", (err as Error).message);
      }
    }
  }
  for (const u of touched) await rebuildProfile(u).catch((e) => console.warn("[signals] profile failed:", (e as Error).message));
  return { items: items.length, saved, failed };
}

/**
 * Wipes own words older than the window: once their signals exist, or after
 * RAW_TEXT_MAX_DAYS regardless. Coach chats are deleted outright.
 */
export async function redactOld(userId?: string): Promise<Record<string, number>> {
  const due = (at: string, src: string, alias = "x") =>
    `${at} < now() - interval '${RAW_TEXT_HOURS} hours' and (${at} < now() - interval '${RAW_TEXT_MAX_DAYS} days' or not ${NO_SIGNAL(src, alias)})`;
  const who = userId ? `and x.user_id = '${userId.replace(/'/g, "")}'` : "";
  const count = async (sql: string) => (await getPool().query(sql)).rowCount ?? 0;
  const r: Record<string, number> = {};

  r.checkins = await count(`
    update public.daily_checkins x set
      answers = (select coalesce(jsonb_agg(case when jsonb_typeof(a->'value') = 'string'
                   and coalesce((select qq->>'type' from jsonb_array_elements(x.questions) qq where qq->>'id' = a->>'id'), 'text') = 'text'
                 then jsonb_set(a, '{value}', 'null'::jsonb) else a end), '[]'::jsonb)
                 from jsonb_array_elements(coalesce(x.answers, '[]'::jsonb)) a),
      today_note = null,
      analysis = case when x.analysis is null then null else x.analysis - 'summary' - 'suggestion_for_today' end,
      redacted_at = now()
    where x.redacted_at is null and x.completed_at is not null and (${due("x.completed_at", "checkin")} or x.completed_at < now() - interval '${RAW_TEXT_HOURS} hours' and not exists (
      select 1 from jsonb_array_elements(coalesce(x.answers, '[]'::jsonb)) a where jsonb_typeof(a->'value') = 'string' and a->>'value' <> '') and x.today_note is null) ${who}`);

  r.sessions = await count(`
    update public.daily_sessions x set
      reflection_answers = case when x.reflection_answers is null then null else (select coalesce(jsonb_agg('""'::jsonb), '[]'::jsonb) from jsonb_array_elements(x.reflection_answers)) end,
      challenge_notes = null,
      redacted_at = now()
    where x.redacted_at is null and (x.reflection_answers is not null or x.challenge_notes is not null)
      and x.created_at < now() - interval '${RAW_TEXT_HOURS} hours'
      and (x.created_at < now() - interval '${RAW_TEXT_MAX_DAYS} days'
           or ((x.reflection_answers is null or not ${NO_SIGNAL("reflection", "x")}) and (x.challenge_notes is null or not ${NO_SIGNAL("challenge", "x")}))) ${who}`);

  r.story_lines = await count(`
    update public.generated_stories x set user_line = null,
      choice = case when x.choice is null then null else x.choice - 'line' end, redacted_at = now()
    where x.redacted_at is null and x.user_line is not null and ${due("x.created_at", "story_line")} ${who}`);

  r.scenarios = await count(`update public.scenario_responses x set reasoning = '', redacted_at = now()
    where x.redacted_at is null and x.reasoning <> '' and ${due("x.created_at", "scenario")} ${who}`);
  r.decisions = await count(`update public.decision_logs x set reasoning = null, redacted_at = now()
    where x.redacted_at is null and x.reasoning is not null and ${due("x.created_at", "decision")} ${who}`);
  r.communication = await count(`update public.exercise_completions x set response = null, speech = null, redacted_at = now()
    where x.redacted_at is null and x.response is not null and ${due("x.created_at", "communication")} ${who}`);
  r.assessments = await count(`
    update public.assessments x set reflections = x.reflections - 'held_back', redacted_at = now()
    where x.redacted_at is null and x.status = 'completed' and x.reflections ? 'held_back' and ${due("x.completed_at", "assessment")} ${who}`);
  // Coach: whole conversations go after the window (replies can repeat what was said).
  r.coach = await count(`delete from public.coach_messages x where x.created_at < now() - interval '${RAW_TEXT_HOURS} hours'
    and (x.created_at < now() - interval '${RAW_TEXT_MAX_DAYS} days' or x.role = 'assistant' or not ${NO_SIGNAL("coach", "x")}) ${who}`);
  return r;
}

export async function rebuildProfile(userId: string): Promise<PersonaProfile> {
  const [events, scores, decisions] = await Promise.all([
    q<SignalEvent>(
      `select life_area, roles, emotions, themes, patterns, decision_style, stress, confidence, mood, skills, created_at::text
         from public.signal_events where user_id = $1 order by created_at desc limit 200`,
      [userId],
    ),
    q<{ dimension: Dimension; current: number }>("select dimension, current from public.skill_progress where user_id = $1", [userId]),
    q<{ score: number }>("select score from public.decision_logs where user_id = $1 and score is not null order by created_at desc limit 10", [userId]),
  ]);
  const sc: Partial<Record<Dimension, number>> = {};
  for (const s of scores) if (DIMENSIONS.includes(s.dimension)) sc[s.dimension] = Number(s.current);
  const p = buildProfile(
    events.map((e) => ({ ...e, created_at: e.created_at })),
    sc,
    decisions.map((d) => Number(d.score)),
  );
  await q(
    `insert into public.persona_profiles (user_id, updated_at, events, archetype, archetype_scores, tags, stress, confidence, mood, skills, levels, decision_level, decision_style)
     values ($1, now(), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     on conflict (user_id) do update set updated_at = now(), events = excluded.events, archetype = excluded.archetype,
       archetype_scores = excluded.archetype_scores, tags = excluded.tags, stress = excluded.stress, confidence = excluded.confidence,
       mood = excluded.mood, skills = excluded.skills, levels = excluded.levels, decision_level = excluded.decision_level, decision_style = excluded.decision_style`,
    [userId, p.events, p.archetype, JSON.stringify(p.archetype_scores), JSON.stringify(p.tags), p.stress, p.confidence, p.mood, JSON.stringify(p.skills), JSON.stringify(p.levels), p.decision_level, p.decision_style],
  );
  return p;
}

export async function getProfile(userId: string): Promise<PersonaProfile | null> {
  const [r] = await q<PersonaProfile>(
    "select events, archetype, archetype_scores, tags, stress::float, confidence::float, mood::float, skills, levels, decision_level, decision_style from public.persona_profiles where user_id = $1",
    [userId],
  );
  return r ?? null;
}

/** "Forget me": signals and profile are deleted; they rebuild from new activity. */
export async function resetSignals(userId: string) {
  await q("delete from public.signal_events where user_id = $1", [userId]);
  await q("delete from public.persona_profiles where user_id = $1", [userId]);
}

/** Hourly job step. */
export async function runSignalsJob() {
  const extracted = await extractPending({ limit: 80 });
  const redacted = await redactOld();
  return { extracted, redacted };
}
