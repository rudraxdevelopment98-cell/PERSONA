/**
 * Gamification is derived only from recorded activity, so XP can never be
 * inflated or invented. Each activity has a fixed XP value.
 */

export const XP_RULES = {
  assessment: 50,
  checkin: 10,
  storyRead: 15,
  scenario: 10,
  sessionComplete: 20,
  challenge: 30,
  decision: 15,
  communication: 15,
  voiceBonus: 5,
  journal: 5,
} as const;

export type ActivityCounts = {
  assessments: number;
  checkins: number;
  storiesRead: number;
  scenarios: number;
  sessionsCompleted: number;
  challenges: number;
  decisions: number;
  communication: number;
  voiceExercises: number;
  journalEntries: number;
};

export function totalXp(c: ActivityCounts): number {
  return (
    c.assessments * XP_RULES.assessment +
    c.checkins * XP_RULES.checkin +
    c.storiesRead * XP_RULES.storyRead +
    c.scenarios * XP_RULES.scenario +
    c.sessionsCompleted * XP_RULES.sessionComplete +
    c.challenges * XP_RULES.challenge +
    c.decisions * XP_RULES.decision +
    c.communication * XP_RULES.communication +
    c.voiceExercises * XP_RULES.voiceBonus +
    c.journalEntries * XP_RULES.journal
  );
}

export const LEVEL_NAMES = [
  "Newcomer",
  "Observer",
  "Explorer",
  "Challenger",
  "Voice Finder",
  "Decision Maker",
  "Connector",
  "Steady Mind",
  "Influencer",
  "Leader",
  "Mentor",
  "Persona Master",
];

/** XP needed to reach `level` (level 1 starts at 0): 100, 250, 450, 700 ... */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  let total = 0;
  for (let l = 2; l <= level; l++) total += 50 + 50 * (l - 1);
  return total;
}

export function levelInfo(xp: number) {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  const floor = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return {
    level,
    name: LEVEL_NAMES[Math.min(level - 1, LEVEL_NAMES.length - 1)],
    xp,
    intoLevel: xp - floor,
    levelSize: next - floor,
    toNext: next - xp,
    progress: Math.round(((xp - floor) / (next - floor)) * 100),
  };
}
