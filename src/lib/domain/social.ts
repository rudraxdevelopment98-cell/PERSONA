import { XP_RULES } from "./gamification";

/** Items a user can choose to share. Anything not listed here is never shareable. */
export const SHARE_ITEMS = [
  { id: "activity", label: "Activity", description: "Programme day, sessions completed, streak", default: true },
  { id: "xp", label: "XP & level", description: "Total XP, level and level name", default: true },
  { id: "badges", label: "Badges", description: "Badges you've earned", default: true },
  { id: "challenges", label: "Challenges", description: "How many real-world challenges you've completed (not what they were)", default: false },
  { id: "growth", label: "Growth", description: "How much each skill has changed since you started (e.g. +8)", default: false },
  { id: "scores", label: "Skill scores", description: "Your current 0-100 skill scores", default: false },
  { id: "focus", label: "Today's focus", description: "The skill you're training today", default: false },
] as const;

export type ShareItem = (typeof SHARE_ITEMS)[number]["id"];
export const SHARE_ITEM_IDS = SHARE_ITEMS.map((i) => i.id) as ShareItem[];
export const DEFAULT_SHARE: ShareItem[] = SHARE_ITEMS.filter((i) => i.default).map((i) => i.id);

export type Snapshot = {
  user_id: string;
  display_name: string;
  timezone: string;
  programme_day: number;
  phase: number | null;
  sessions_completed: number;
  streak: number;
  best_streak: number;
  last_active_date: string | null;
  xp: number;
  level: number;
  level_name: string;
  challenges_completed: number;
  badges: { code: string; title: string; earned_at: string }[];
  growth: Record<string, number>;
  scores: Record<string, number>;
  focus: { title: string; dimension: string } | null;
};

/** What another person may see. Fields that are not shared are absent (undefined). */
export type SharedView = {
  user_id: string;
  display_name: string;
  shared: ShareItem[];
  programme_day?: number;
  phase?: number | null;
  sessions_completed?: number;
  streak?: number;
  best_streak?: number;
  last_active_date?: string | null;
  xp?: number;
  level?: number;
  level_name?: string;
  challenges_completed?: number;
  badges?: Snapshot["badges"];
  growth?: Record<string, number>;
  scores?: Record<string, number>;
  focus?: Snapshot["focus"];
};

/** A streak is only current if the last completed session was today or yesterday (owner's calendar). */
export function liveStreak(streak: number, lastActive: string | null, today: string): number {
  if (!lastActive) return 0;
  const days = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${lastActive}T00:00:00Z`)) / 86_400_000);
  return days <= 1 ? streak : 0;
}

export function filterSnapshot(s: Snapshot, items: ShareItem[], ownerToday: string): SharedView {
  const has = (i: ShareItem) => items.includes(i);
  const v: SharedView = { user_id: s.user_id, display_name: s.display_name, shared: SHARE_ITEM_IDS.filter(has) };
  if (has("activity")) {
    v.programme_day = s.programme_day;
    v.phase = s.phase;
    v.sessions_completed = s.sessions_completed;
    v.streak = liveStreak(s.streak, s.last_active_date, ownerToday);
    v.best_streak = s.best_streak;
    v.last_active_date = s.last_active_date;
  }
  if (has("xp")) {
    v.xp = s.xp;
    v.level = s.level;
    v.level_name = s.level_name;
  }
  if (has("badges")) v.badges = s.badges;
  if (has("challenges")) v.challenges_completed = s.challenges_completed;
  if (has("growth")) v.growth = s.growth;
  if (has("scores")) v.scores = s.scores;
  if (has("focus")) v.focus = s.focus;
  return v;
}

export function sanitiseItems(items: unknown): ShareItem[] {
  if (!Array.isArray(items)) return [...DEFAULT_SHARE];
  return SHARE_ITEM_IDS.filter((i) => items.includes(i));
}

// ---------------------------------------------------------------------------
// Races
// ---------------------------------------------------------------------------

export const RACE_KINDS = [
  { id: "streak", label: "Streak race", unit: "day streak", description: "Longest run of consecutive days with a completed session." },
  { id: "sessions", label: "Session sprint", unit: "sessions", description: "Most daily sessions completed." },
  { id: "challenges", label: "Challenge hunt", unit: "challenges", description: "Most real-world challenges completed." },
  { id: "checkins", label: "Check-in race", unit: "check-ins", description: "Most daily check-ins completed." },
  { id: "xp", label: "XP race", unit: "XP", description: "Most XP earned from practice during the race." },
] as const;
export type RaceKind = (typeof RACE_KINDS)[number]["id"];

/** Timestamped events for one user inside the race window (ISO strings / YYYY-MM-DD dates). */
export type RaceEvents = {
  sessionDates: string[]; // local dates of completed sessions
  sessions: number;
  checkins: number;
  challenges: number;
  storiesRead: number;
  scenarios: number;
  decisions: number;
  communication: number;
  journal: number;
};

export function longestRun(dates: string[]): number {
  const days = [...new Set(dates)].map((d) => Date.parse(`${d}T00:00:00Z`) / 86_400_000).sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  days.forEach((d, i) => {
    run = i > 0 && d === days[i - 1] + 1 ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return best;
}

export function raceScore(kind: RaceKind, e: RaceEvents): number {
  switch (kind) {
    case "streak":
      return longestRun(e.sessionDates);
    case "sessions":
      return e.sessions;
    case "challenges":
      return e.challenges;
    case "checkins":
      return e.checkins;
    case "xp":
      return (
        e.checkins * XP_RULES.checkin +
        e.storiesRead * XP_RULES.storyRead +
        e.scenarios * XP_RULES.scenario +
        e.sessions * XP_RULES.sessionComplete +
        e.challenges * XP_RULES.challenge +
        e.decisions * XP_RULES.decision +
        e.communication * XP_RULES.communication +
        e.journal * XP_RULES.journal
      );
  }
}

/** Standard competition ranking ("1, 2, 2, 4"). */
export function rankScores<T extends { score: number }>(rows: T[]): (T & { rank: number })[] {
  const sorted = [...rows].sort((a, b) => b.score - a.score);
  return sorted.map((r, i) => ({ ...r, rank: i > 0 && r.score === sorted[i - 1].score ? -1 : i + 1 })).map((r, i, arr) => {
    if (r.rank !== -1) return r;
    let j = i;
    while (arr[j].rank === -1) j--;
    return { ...r, rank: arr[j].rank };
  });
}
