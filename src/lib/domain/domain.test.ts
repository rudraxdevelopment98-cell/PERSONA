import { describe, expect, it } from "vitest";
import { ASSESSMENT_ITEMS, isAssessmentComplete, scoreAssessment } from "./assessment";
import { DIMENSIONS } from "./dimensions";
import { baseFocusForDay, focusForDay, phaseForDay, programmeDay } from "./programme";
import { computeScores, consistencyScore } from "./scoring";

describe("assessment", () => {
  it("has four items for every dimension and unique ids", () => {
    for (const d of DIMENSIONS) expect(ASSESSMENT_ITEMS.filter((i) => i.dimension === d)).toHaveLength(4);
    expect(new Set(ASSESSMENT_ITEMS.map((i) => i.id)).size).toBe(ASSESSMENT_ITEMS.length);
  });

  it("scores the best possible answers as 100 and the worst as 0", () => {
    const best = ASSESSMENT_ITEMS.map((i) => ({
      question_id: i.id,
      value: i.kind === "likert" ? (i.reverse ? 1 : 5) : Math.max(...i.options.map((o) => o.value)),
    }));
    const worst = ASSESSMENT_ITEMS.map((i) => ({
      question_id: i.id,
      value: i.kind === "likert" ? (i.reverse ? 5 : 1) : Math.min(...i.options.map((o) => o.value)),
    }));
    expect(isAssessmentComplete(best)).toBe(true);
    for (const d of DIMENSIONS) {
      expect(scoreAssessment(best)[d]).toBe(100);
      expect(scoreAssessment(worst)[d]).toBe(0);
    }
  });

  it("ignores unknown questions and out-of-range values", () => {
    const s = scoreAssessment([
      { question_id: "nope", value: 5 },
      { question_id: "conf_1", value: 9 },
      { question_id: "conf_1", value: 3 },
    ]);
    expect(s.confidence).toBe(50);
    expect(s.leadership).toBeNull();
  });
});

describe("programme", () => {
  it("maps days to phases and cycles focus areas", () => {
    expect(phaseForDay(1).name).toBe("Foundation");
    expect(phaseForDay(31).name).toBe("Development");
    expect(phaseForDay(90).name).toBe("Transformation");
    expect(baseFocusForDay(1).title).toBe("Self-awareness");
    expect(baseFocusForDay(7).title).toBe("Confidence");
    expect(baseFocusForDay(61).title).toBe("Leadership");
  });

  it("personalises every third day toward weaknesses", () => {
    expect(focusForDay(3, ["critical_thinking"]).dimension).toBe("critical_thinking");
    expect(focusForDay(1, ["critical_thinking"]).personalised).toBe(false);
  });

  it("computes programme day from the start date", () => {
    expect(programmeDay(null, "2026-01-01")).toBe(0);
    expect(programmeDay("2026-01-01", "2026-01-01")).toBe(1);
    expect(programmeDay("2026-01-01", "2026-01-10")).toBe(10);
    expect(programmeDay("2026-01-01", "2027-01-01")).toBe(90);
    expect(programmeDay("2026-02-01", "2026-01-01")).toBe(0);
  });
});

describe("scoring engine", () => {
  const noConsistency = { daysElapsed: 0, sessionsCompleted: 0, checkinsCompleted: 0, challengesCompleted: 0 };

  it("returns the baseline when there is no other evidence", () => {
    const [s] = computeScores({ baseline: { confidence: 40 }, selfReports: [], demonstrated: [], consistency: noConsistency });
    expect(s.current).toBe(40);
    expect(s.demonstrated).toBeNull();
    expect(s.consistency).toBeNull();
  });

  it("skips dimensions with no baseline instead of inventing one", () => {
    expect(computeScores({ baseline: {}, selfReports: [], demonstrated: [], consistency: noConsistency })).toHaveLength(0);
  });

  it("blends self-report with the baseline and ramps demonstrated weight", () => {
    const one = computeScores({
      baseline: { confidence: 40 },
      selfReports: [{ dimension: "confidence", score: 80, at: "2026-01-02" }],
      demonstrated: [{ dimension: "confidence", score: 90, at: "2026-01-02" }],
      consistency: noConsistency,
    })[0];
    // self = (40*3 + 80)/4 = 50; demonstrated weight = 0.55/3
    expect(one.self_reported).toBe(50);
    expect(one.current).toBeCloseTo((50 * 0.45 + 90 * (0.55 / 3)) / (0.45 + 0.55 / 3), 1);
  });

  it("applies consistency to self-discipline only, and only from day 7", () => {
    const full = (days: number) => ({ daysElapsed: days, sessionsCompleted: days, checkinsCompleted: days, challengesCompleted: days });
    const early = computeScores({ baseline: { leadership: 50, self_discipline: 50 }, selfReports: [], demonstrated: [], consistency: full(1) });
    expect(early.map((s) => s.current)).toEqual([50, 50]);
    const later = computeScores({ baseline: { leadership: 50, self_discipline: 50 }, selfReports: [], demonstrated: [], consistency: full(8) });
    expect(later.find((s) => s.dimension === "leadership")!.current).toBe(50);
    expect(later.find((s) => s.dimension === "self_discipline")!.current).toBeCloseTo((50 * 0.45 + 100 * 0.35) / 0.8, 1);
  });

  it("computes consistency from completion", () => {
    expect(consistencyScore({ daysElapsed: 10, sessionsCompleted: 10, checkinsCompleted: 10, challengesCompleted: 10 })).toBe(100);
    expect(consistencyScore({ daysElapsed: 10, sessionsCompleted: 5, checkinsCompleted: 0, challengesCompleted: 0 })).toBe(25);
  });
});

import { currentStreak } from "./programme";
describe("streak", () => {
  it("counts consecutive days ending today or yesterday", () => {
    expect(currentStreak([1, 2, 3], 3)).toBe(3);
    expect(currentStreak([1, 2, 3], 4)).toBe(3);
    expect(currentStreak([1, 2, 3], 5)).toBe(0);
    expect(currentStreak([1, 3, 4], 4)).toBe(2);
    expect(currentStreak([], 1)).toBe(0);
  });
});

import { decisionStats } from "./labs";
describe("decision stats", () => {
  it("returns null without data and computes calibration", () => {
    expect(decisionStats([])).toBeNull();
    const s = decisionStats([
      { score: 50, confidence: 9, first_choice_ms: 10000, total_time_ms: 60000, choice_changes: 2 },
      { score: 60, confidence: 9, first_choice_ms: 20000, total_time_ms: 80000, choice_changes: 0 },
      { score: 40, confidence: 8, first_choice_ms: null, total_time_ms: 40000, choice_changes: 1 },
    ])!;
    expect(s.count).toBe(3);
    expect(s.avgFirstChoiceSec).toBe(15);
    expect(s.calibrationGap).toBe(37);
    expect(s.calibrationNote).toMatch(/ahead/);
  });
});

import { historyByDay } from "./scoring";
describe("history", () => {
  it("carries scores forward and emits one point per recorded day", () => {
    const h = historyByDay([
      { dimension: "confidence", score: 40, recorded_at: "2026-01-01T10:00:00Z" },
      { dimension: "leadership", score: 60, recorded_at: "2026-01-01T10:00:00Z" },
      { dimension: "confidence", score: 50, recorded_at: "2026-01-03T09:00:00Z" },
      { dimension: "confidence", score: 52, recorded_at: "2026-01-03T18:00:00Z" },
    ]);
    expect(h).toHaveLength(2);
    expect(h[0].overall).toBe(50);
    expect(h[1].scores).toEqual({ confidence: 52, leadership: 60 });
    expect(h[1].overall).toBe(56);
  });
});

import { levelInfo, totalXp, xpForLevel } from "./gamification";
describe("gamification", () => {
  it("computes XP and levels from activity", () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(100);
    expect(xpForLevel(3)).toBe(250);
    const zero = { assessments: 0, checkins: 0, storiesRead: 0, scenarios: 0, sessionsCompleted: 0, challenges: 0, decisions: 0, communication: 0, voiceExercises: 0, journalEntries: 0 };
    expect(totalXp(zero)).toBe(0);
    expect(totalXp({ ...zero, assessments: 1, checkins: 1, scenarios: 3 })).toBe(90);
    const l = levelInfo(120);
    expect(l.level).toBe(2);
    expect(l.intoLevel).toBe(20);
    expect(l.toNext).toBe(130);
    expect(levelInfo(0).name).toBe("Newcomer");
  });
});

import { analyseSpeech } from "./speech";
describe("speech metrics", () => {
  it("counts words, pace and fillers", () => {
    const m = analyseSpeech("Um I think, um, we should basically move the deadline. You know it's risky.", 30_000, 2_000);
    expect(m.word_count).toBe(14);
    expect(m.wpm).toBe(28);
    expect(m.fillers).toEqual({ um: 2, basically: 1, "you know": 1 });
    expect(m.filler_count).toBe(4);
  });
  it("only counts ambiguous words when repeated", () => {
    expect(analyseSpeech("I like this plan", 5000, 0).filler_count).toBe(0);
    expect(analyseSpeech("it was like, like, really like hard", 5000, 0).fillers.like).toBe(2);
  });
});

import { assessmentPack } from "./assessment-i18n";
describe("assessment translations", () => {
  it("cover every item and option in Hinglish and Hindi", () => {
    for (const lang of ["hinglish", "hi"] as const) {
      const pack = assessmentPack(lang)!;
      for (const item of ASSESSMENT_ITEMS) {
        const t = pack.items[item.id];
        expect(t?.text, `${lang} ${item.id}`).toBeTruthy();
        if (item.kind === "situational") expect(t.options?.length, `${lang} ${item.id} options`).toBe(item.options.length);
      }
      expect(pack.likert).toHaveLength(5);
    }
    expect(assessmentPack("en")).toBeNull();
  });
});

import { DEFAULT_SHARE, filterSnapshot, liveStreak, longestRun, raceScore, rankScores, sanitiseItems, type Snapshot } from "./social";
describe("social", () => {
  const snap: Snapshot = {
    user_id: "u", display_name: "Asha", timezone: "UTC", programme_day: 12, phase: 1, sessions_completed: 10, streak: 5, best_streak: 6,
    last_active_date: "2026-03-10", xp: 640, level: 4, level_name: "Challenger", challenges_completed: 3,
    badges: [{ code: "baseline", title: "Baseline set", earned_at: "2026-03-01" }], growth: { confidence: 8 }, scores: { confidence: 61 },
    focus: { title: "Confidence", dimension: "confidence" },
  };
  it("shares only granted items", () => {
    const v = filterSnapshot(snap, ["xp"], "2026-03-10");
    expect(v.xp).toBe(640);
    expect(v.scores).toBeUndefined();
    expect(v.growth).toBeUndefined();
    expect(v.sessions_completed).toBeUndefined();
    expect(Object.keys(v)).not.toContain("timezone");
  });
  it("defaults to activity, xp and badges and drops unknown items", () => {
    expect(DEFAULT_SHARE).toEqual(["activity", "xp", "badges"]);
    expect(sanitiseItems(["scores", "journal", "xp"])).toEqual(["xp", "scores"]);
  });
  it("expires a stale streak", () => {
    expect(liveStreak(5, "2026-03-10", "2026-03-11")).toBe(5);
    expect(liveStreak(5, "2026-03-10", "2026-03-12")).toBe(5); // rest day
    expect(liveStreak(5, "2026-03-10", "2026-03-13")).toBe(0);
    expect(filterSnapshot(snap, ["activity"], "2026-03-14").streak).toBe(0);
  });
  it("scores races and ranks ties", () => {
    expect(longestRun(["2026-03-01", "2026-03-02", "2026-03-02", "2026-03-04", "2026-03-05", "2026-03-06"])).toBe(3);
    const e = { sessionDates: [], sessions: 2, checkins: 3, challenges: 1, storiesRead: 2, scenarios: 6, decisions: 1, communication: 0, journal: 2 };
    expect(raceScore("xp", e)).toBe(3 * 10 + 2 * 15 + 6 * 10 + 2 * 20 + 30 + 15 + 2 * 5);
    expect(rankScores([{ score: 5 }, { score: 9 }, { score: 5 }, { score: 1 }]).map((r) => r.rank)).toEqual([1, 2, 2, 4]);
  });
});

import { DEPTH_INFO, isCompleteForDepth, itemsForDepth } from "./assessment";
describe("assessment depth", () => {
  it("nests quick in standard in deep with balanced items per skill", () => {
    const q = itemsForDepth("quick"), s = itemsForDepth("standard"), d = itemsForDepth("deep");
    expect([q.length, s.length, d.length]).toEqual([10, 30, 40]);
    expect(q.every((i) => s.includes(i)) && s.every((i) => d.includes(i))).toBe(true);
    for (const dim of DIMENSIONS) {
      expect(q.filter((i) => i.dimension === dim)).toHaveLength(1);
      const st = s.filter((i) => i.dimension === dim);
      expect(st).toHaveLength(3);
      expect(st.filter((i) => i.kind === "likert" && i.reverse)).toHaveLength(1);
    }
    expect(DEPTH_INFO.standard.questions).toBe(30);
  });
  it("checks completeness per depth", () => {
    const quick = itemsForDepth("quick").map((i) => ({ question_id: i.id, value: 3 }));
    expect(isCompleteForDepth(quick, "quick")).toBe(true);
    expect(isCompleteForDepth(quick, "standard")).toBe(false);
  });
});

import { CHALLENGE_TYPES, SCENARIO_FORMATS, WORLDS, checkinLens, dayRecipe, newSeason, nextWorldOptions, pickDistinct, seasonFor } from "./variety";
describe("variety engine", () => {
  it("splits the programme into weekly seasons with finales", () => {
    expect(seasonFor(1)).toEqual({ season: 1, position: 1, finale: false });
    expect(seasonFor(7)).toEqual({ season: 1, position: 7, finale: true });
    expect(seasonFor(8)).toEqual({ season: 2, position: 1, finale: false });
    expect(seasonFor(90)).toMatchObject({ season: 13, finale: true });
  });
  it("is stable for a user and day, and differs across days", () => {
    const r = { formats: [], arenas: [], challenges: [], reflections: [] };
    expect(dayRecipe("u1", 5, r)).toEqual(dayRecipe("u1", 5, r));
    const days = new Set(Array.from({ length: 10 }, (_, i) => JSON.stringify(dayRecipe("u1", i + 1, r))));
    expect(days.size).toBeGreaterThan(5);
  });
  it("picks distinct formats and avoids recent ones", () => {
    const recent: string[] = SCENARIO_FORMATS.slice(0, 5).map((f) => f.id);
    const d = dayRecipe("u2", 3, { formats: recent, arenas: [], challenges: [CHALLENGE_TYPES[0].id], reflections: [] });
    expect(new Set(d.formats).size).toBe(3);
    expect(d.formats.some((f) => recent.includes(f))).toBe(false);
    expect(d.challenge).not.toBe(CHALLENGE_TYPES[0].id);
  });
  it("never reuses a recent world unless asked, and honours the user's choice", () => {
    const recent: string[] = WORLDS.slice(0, 20).map((w) => w.id);
    expect(recent).not.toContain(newSeason("u3", 4, { worlds: recent, genres: [] }).world);
    expect(newSeason("u3", 4, { worlds: [], genres: [] }, "mars").world).toBe("mars");
    expect(nextWorldOptions("u3", 2, recent).every((w) => !recent.includes(w))).toBe(true);
  });
  it("falls back gracefully when everything was used", () => {
    const all = WORLDS.map((w) => w.id);
    expect(pickDistinct(WORLDS, "s", all, 2)).toHaveLength(2);
    expect(typeof checkinLens("u", 1, [])).toBe("string");
  });
});

describe("variety: consecutive days", () => {
  it("never repeats a scenario format on back-to-back days", async () => {
    const { dayRecipe } = await import("./variety");
    let prev: string[] = [];
    for (let d = 1; d <= 90; d++) {
      const r = dayRecipe("user-x", d, { formats: prev, arenas: [], challenges: [], reflections: [] });
      expect(r.formats.some((f) => prev.includes(f))).toBe(false);
      prev = r.formats;
    }
  });
});

import { bestStreakWithRest, streakWithRest } from "./programme";
describe("streak with weekly rest day", () => {
  it("keeps the streak through one missed day", () => {
    expect(streakWithRest([1, 2, 3, 5, 6], 6)).toEqual({ streak: 5, restDays: [4] });
    expect(streakWithRest([1, 2, 3], 5)).toEqual({ streak: 3, restDays: [4] }); // yesterday was the rest day
    expect(streakWithRest([1, 2, 3], 4)).toEqual({ streak: 3, restDays: [] }); // today not done yet
  });
  it("allows only one rest day per 7 days", () => {
    expect(streakWithRest([1, 2, 4, 5, 7, 8], 8).streak).toBe(4); // rests at 6 and 3 are too close: stops at 3
    expect(streakWithRest([1, 3, 4, 5, 6, 7, 8, 9, 11], 11)).toEqual({ streak: 9, restDays: [2, 10] });
  });
  it("breaks on two missed days in a row", () => {
    expect(streakWithRest([1, 2, 3], 6).streak).toBe(0);
    expect(streakWithRest([1, 2, 5, 6], 6).streak).toBe(2);
  });
  it("computes the best streak with the same rule", () => {
    expect(bestStreakWithRest([1, 2, 3, 5, 6, 7])).toBe(6);
    expect(bestStreakWithRest([1, 2, 4, 5, 7, 8])).toBe(4);
    expect(bestStreakWithRest([])).toBe(0);
  });
});
