import { z } from "zod";
import { DIMENSIONS, type Dimension } from "./dimensions";

/**
 * Private persona signals. Instead of keeping what someone wrote, the app keeps
 * a few closed-vocabulary tags and numbers about it. Every field is an enum or
 * a number, so names, places, quotes or any other identifying detail cannot be
 * stored even by mistake.
 */

export const RAW_TEXT_HOURS = 48;
/** Even if the AI is unavailable, own words are wiped after this many days. */
export const RAW_TEXT_MAX_DAYS = 7;
/** Tag weight halves roughly every two weeks, so the profile follows who you are now. */
export const DECAY_DAYS = 21;

export const SIGNAL_AREAS = ["family", "friends", "love", "studies", "work", "health", "money", "self", "public", "online", "other"] as const;
export const SIGNAL_ROLES = ["parent", "sibling", "partner", "friend", "relative", "teacher", "boss", "colleague", "classmate", "neighbour", "stranger", "customer", "group", "self"] as const;
export const SIGNAL_EMOTIONS = ["anxious", "stressed", "sad", "angry", "frustrated", "lonely", "ashamed", "guilty", "confused", "overwhelmed", "calm", "hopeful", "proud", "happy", "grateful", "motivated"] as const;
export const SIGNAL_THEMES = [
  "conflict", "criticism", "comparison", "rejection", "praise", "deadline", "exam", "money_pressure", "health_worry", "speaking_up",
  "saying_no", "big_decision", "new_start", "loss", "expectations", "responsibility", "uncertainty", "achievement", "loneliness", "trust",
] as const;
export const SIGNAL_PATTERNS = [
  "overthinking", "people_pleasing", "avoidance", "catastrophising", "self_criticism", "mind_reading", "all_or_nothing", "perfectionism",
  "procrastination", "seeking_reassurance", "assertive_action", "calm_reflection", "reframing", "asking_for_help", "taking_initiative", "setting_boundary",
] as const;
export const DECISION_STYLES = ["avoidant", "impulsive", "dependent", "deliberate", "balanced"] as const;
export const SIGNAL_SOURCES = ["checkin", "reflection", "challenge", "story_line", "scenario", "decision", "communication", "coach", "assessment"] as const;

export type SignalSource = (typeof SIGNAL_SOURCES)[number];
export type Pattern = (typeof SIGNAL_PATTERNS)[number];

const skillShape = Object.fromEntries(DIMENSIONS.map((d) => [d, z.number().optional()])) as Record<Dimension, z.ZodOptional<z.ZodNumber>>;

/**
 * One text item turned into signals. No free-text fields on purpose: only enums
 * and numbers. Ranges are applied by cleanSignal() (models sometimes overshoot).
 */
export const signalSchema = z.object({
  life_area: z.enum(SIGNAL_AREAS).describe("Which part of life this is mostly about"),
  roles: z.array(z.enum(SIGNAL_ROLES)).describe("Up to 3: who else is involved, by role only"),
  emotions: z.array(z.enum(SIGNAL_EMOTIONS)).describe("Up to 3"),
  themes: z.array(z.enum(SIGNAL_THEMES)).describe("Up to 3"),
  patterns: z.array(z.enum(SIGNAL_PATTERNS)).describe("Up to 3 thinking or behaviour patterns visible in how they act or describe it"),
  decision_style: z.enum(DECISION_STYLES).nullable().describe("Only if the text shows how they decide; else null"),
  stress: z.number().describe("0-10"),
  confidence: z.number().describe("0-10"),
  mood: z.number().describe("-2 (very low) to +2 (very good)"),
  skills: z.object(skillShape).describe("Evidence about each skill shown in this text, -2 (clearly weak) to +2 (clearly strong); omit if no evidence"),
});
export type Signal = z.infer<typeof signalSchema>;
export const signalBatchSchema = z.object({ items: z.array(signalSchema) });

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(Number.isFinite(n) ? n : 0)));
/** Applies ranges and limits; drops duplicates. Always run before saving. */
export function cleanSignal(s: Signal): Signal {
  const uniq = <T,>(a: T[]) => [...new Set(a)].slice(0, 3);
  const skills: Signal["skills"] = {};
  for (const d of DIMENSIONS) if (typeof s.skills?.[d] === "number") skills[d] = clamp(s.skills[d]!, -2, 2);
  return {
    ...s,
    roles: uniq(s.roles),
    emotions: uniq(s.emotions),
    themes: uniq(s.themes),
    patterns: uniq(s.patterns),
    stress: clamp(s.stress, 0, 10),
    confidence: clamp(s.confidence, 0, 10),
    mood: clamp(s.mood, -2, 2),
    skills,
  };
}

export const SIGNALS_SYSTEM = `You turn short private texts written by a self-development app user into abstract signals for their growth profile.
For EACH numbered text, return one item in the same order, using ONLY the allowed values.
- Judge how the person thinks, feels and acts. Use roles (parent, friend, boss...) for other people, never who they are.
- Prefer few, accurate tags over many. Use empty lists when unsure.
- stress / confidence: 0-10 as they come across in this text. mood: -2 (very low) to +2 (very good).
- skills: only include a skill when the text gives real evidence about it.
The output is all that will be kept; the texts themselves are deleted afterwards.`;

// ---------------------------------------------------------------------------
// Profile: built only from signal events and skill scores (never from text).
// ---------------------------------------------------------------------------

export type SignalEvent = Signal & { created_at: string };

export const ARCHETYPES = ["overthinker", "people_pleaser", "quiet_observer", "bold_starter", "steady_builder", "independent_thinker", "warm_connector"] as const;
export type Archetype = (typeof ARCHETYPES)[number];

export const ARCHETYPE_INFO: Record<Archetype, { emoji: string; name: string; line: string }> = {
  overthinker: { emoji: "🌀", name: "The Overthinker", line: "You think deeply, sometimes long after the moment has passed. Practice: decide with enough, not perfect, information." },
  people_pleaser: { emoji: "🤝", name: "The People-pleaser", line: "You keep the peace and care how others feel. Practice: a kind, clear no." },
  quiet_observer: { emoji: "🔭", name: "The Quiet Observer", line: "You read people and rooms well but hold your own voice back. Practice: say the first sentence." },
  bold_starter: { emoji: "🚀", name: "The Bold Starter", line: "You act fast and lead the way. Practice: follow-through and a pause before big calls." },
  steady_builder: { emoji: "🧱", name: "The Steady Builder", line: "You show up and keep going. Practice: stretch into situations that feel risky." },
  independent_thinker: { emoji: "🧭", name: "The Independent Thinker", line: "You form your own views and question easy answers. Practice: bringing people along." },
  warm_connector: { emoji: "💬", name: "The Warm Connector", line: "You connect easily and lift others. Practice: holding your view when the group disagrees." },
};

export type PersonaProfile = {
  events: number;
  archetype: Archetype | null;
  archetype_scores: Partial<Record<Archetype, number>>;
  tags: { areas: Record<string, number>; roles: Record<string, number>; emotions: Record<string, number>; themes: Record<string, number>; patterns: Record<string, number> };
  stress: number | null;
  confidence: number | null;
  mood: number | null;
  skills: Partial<Record<Dimension, number>>;
  levels: Partial<Record<Dimension, number>>;
  decision_level: number | null;
  decision_style: (typeof DECISION_STYLES)[number] | null;
};

const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const top = (m: Record<string, number>, n: number) => Object.fromEntries(Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => [k, round(v)]));

/** Score band 1-5 from a 0-100 skill score. */
export const levelOf = (score: number) => Math.max(1, Math.min(5, 1 + Math.floor(score / 20)));

/**
 * Decayed weights: recent signals count more. `now` is injectable for tests.
 * scores: current 0-100 skill scores; decisionScores: recent Decision Lab scores.
 */
export function buildProfile(events: SignalEvent[], scores: Partial<Record<Dimension, number>>, decisionScores: number[], now = Date.now()): PersonaProfile {
  const tags: PersonaProfile["tags"] = { areas: {}, roles: {}, emotions: {}, themes: {}, patterns: {} };
  const styles: Record<string, number> = {};
  const skillSum: Partial<Record<Dimension, number>> = {};
  const skillW: Partial<Record<Dimension, number>> = {};
  let wSum = 0, stress = 0, conf = 0, mood = 0;
  for (const e of events) {
    const age = Math.max(0, (now - Date.parse(e.created_at)) / 86_400_000);
    const w = Math.pow(0.5, age / DECAY_DAYS);
    wSum += w;
    stress += w * e.stress;
    conf += w * e.confidence;
    mood += w * e.mood;
    tags.areas[e.life_area] = (tags.areas[e.life_area] ?? 0) + w;
    for (const r of e.roles) tags.roles[r] = (tags.roles[r] ?? 0) + w;
    for (const x of e.emotions) tags.emotions[x] = (tags.emotions[x] ?? 0) + w;
    for (const x of e.themes) tags.themes[x] = (tags.themes[x] ?? 0) + w;
    for (const x of e.patterns) tags.patterns[x] = (tags.patterns[x] ?? 0) + w;
    if (e.decision_style) styles[e.decision_style] = (styles[e.decision_style] ?? 0) + w;
    for (const d of DIMENSIONS) {
      const v = e.skills?.[d];
      if (typeof v === "number") {
        skillSum[d] = (skillSum[d] ?? 0) + w * v;
        skillW[d] = (skillW[d] ?? 0) + w;
      }
    }
  }
  const skills: PersonaProfile["skills"] = {};
  for (const d of DIMENSIONS) if (skillW[d]) skills[d] = round(skillSum[d]! / skillW[d]!);
  const levels: PersonaProfile["levels"] = {};
  for (const d of DIMENSIONS) if (typeof scores[d] === "number") levels[d] = levelOf(scores[d]!);

  const dAvg = decisionScores.length ? decisionScores.reduce((a, b) => a + b, 0) / decisionScores.length : null;
  const decisionBase = dAvg ?? scores.decision_making ?? null;
  const style = Object.entries(styles).sort((a, b) => b[1] - a[1])[0]?.[0] as PersonaProfile["decision_style"] | undefined;

  const profile: PersonaProfile = {
    events: events.length,
    archetype: null,
    archetype_scores: {},
    tags: { areas: top(tags.areas, 6), roles: top(tags.roles, 6), emotions: top(tags.emotions, 6), themes: top(tags.themes, 6), patterns: top(tags.patterns, 8) },
    stress: wSum ? round(stress / wSum) : null,
    confidence: wSum ? round(conf / wSum) : null,
    mood: wSum ? round(mood / wSum) : null,
    skills,
    levels,
    decision_level: decisionBase == null ? null : levelOf(decisionBase),
    decision_style: style ?? null,
  };
  const s = archetypeScores(profile, scores);
  profile.archetype_scores = s;
  // A type only after enough evidence; until then the profile is "forming".
  if (events.length >= 5) profile.archetype = (Object.entries(s).sort((a, b) => b[1] - a[1])[0]?.[0] as Archetype) ?? null;
  return profile;
}

/** 0-1 closeness to each archetype, from skill scores and pattern shares. */
export function archetypeScores(p: Pick<PersonaProfile, "tags">, scores: Partial<Record<Dimension, number>>): Record<Archetype, number> {
  const sk = (d: Dimension) => (scores[d] ?? 50) / 100;
  const total = Object.values(p.tags.patterns).reduce((a, b) => a + b, 0) || 1;
  const pt = (x: Pattern) => (p.tags.patterns[x] ?? 0) / total;
  const raw: Record<Archetype, number> = {
    overthinker: 1.6 * (pt("overthinking") + pt("catastrophising") + pt("seeking_reassurance") + pt("perfectionism")) + 0.6 * (1 - sk("decision_making")),
    people_pleaser: 1.6 * (pt("people_pleasing") + pt("avoidance")) + 0.6 * (1 - sk("assertiveness")),
    quiet_observer: 1.2 * pt("calm_reflection") + 0.35 * (sk("emotional_intelligence") + sk("social_intelligence")) + 0.5 * (1 - sk("confidence")),
    bold_starter: 1.4 * (pt("taking_initiative") + pt("assertive_action")) + 0.35 * (sk("confidence") + sk("decision_making")) + 0.3 * (1 - sk("self_discipline")),
    steady_builder: 0.9 * sk("self_discipline") + 0.8 * pt("calm_reflection") + 0.6 * pt("reframing") - 1.0 * pt("procrastination"),
    independent_thinker: 0.45 * (sk("independent_thinking") + sk("critical_thinking")) + 0.25 * (1 - sk("social_intelligence")) + 0.8 * pt("setting_boundary"),
    warm_connector: 0.45 * (sk("social_intelligence") + sk("communication")) + 1.0 * pt("asking_for_help") + 0.2 * (1 - sk("independent_thinking")),
  };
  const max = Math.max(...Object.values(raw), 0.0001);
  return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, round(Math.max(0, v) / max)])) as Record<Archetype, number>;
}

const pretty = (s: string) => s.replace(/_/g, " ");
/** A short, detail-free summary for the AI (instead of people's own words). */
export function profileForAI(p: PersonaProfile): string {
  if (!p.events) return "";
  const keys = (m: Record<string, number>, n: number) => Object.keys(m).slice(0, n).map(pretty).join(", ") || "none yet";
  const lines = [
    `Signals from ${p.events} recent entries (abstracted; their own words are deliberately not kept):`,
    p.archetype ? `- Type: ${ARCHETYPE_INFO[p.archetype].name}` : "- Type: still forming",
    `- Recurring patterns: ${keys(p.tags.patterns, 4)}`,
    `- Situations that come up: ${keys(p.tags.themes, 4)}; mostly about ${keys(p.tags.areas, 3)}; people involved: ${keys(p.tags.roles, 3)}`,
    `- Frequent feelings: ${keys(p.tags.emotions, 4)}`,
    p.stress != null ? `- Stress ${p.stress}/10, confidence ${p.confidence}/10, mood ${p.mood} (-2..+2)` : "",
    p.decision_style ? `- Decision style: ${p.decision_style}${p.decision_level ? ` (level ${p.decision_level}/5)` : ""}` : "",
  ];
  return lines.filter(Boolean).join("\n");
}
