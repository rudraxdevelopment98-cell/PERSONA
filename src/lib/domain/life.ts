/** Who the person is right now, and which parts of life they want to grow in. Content follows these. */
export const LIFE_STAGES = [
  { id: "student", emoji: "🎒", en: "Student", hi: "Padhai kar raha/rahi hoon" },
  { id: "working", emoji: "💼", en: "Working", hi: "Job karta/karti hoon" },
  { id: "business", emoji: "🏪", en: "Own business / freelance", hi: "Apna kaam / business" },
  { id: "home", emoji: "🏡", en: "Managing home / family", hi: "Ghar aur family sambhalta/sambhalti hoon" },
  { id: "seeking", emoji: "🧭", en: "Looking for work / a break", hi: "Kaam dhoondh raha/rahi hoon ya break par" },
  { id: "other", emoji: "✨", en: "Something else", hi: "Kuch aur" },
] as const;
export type LifeStage = (typeof LIFE_STAGES)[number]["id"];

export const LIFE_AREAS = [
  { id: "family", emoji: "👨‍👩‍👧", en: "Family", hi: "Family", arenas: ["family"] },
  { id: "friends", emoji: "🫂", en: "Friends", hi: "Dost", arenas: ["friends", "online"] },
  { id: "love", emoji: "💞", en: "Love & partner", hi: "Rishte / love life", arenas: ["partner"] },
  { id: "studies", emoji: "📚", en: "Studies & exams", hi: "Padhai & exams", arenas: ["study", "team"] },
  { id: "work", emoji: "💼", en: "Work & career", hi: "Kaam & career", arenas: ["work", "team"] },
  { id: "health", emoji: "🌿", en: "Health & habits", hi: "Health & aadatein", arenas: ["health"] },
  { id: "money", emoji: "💰", en: "Money", hi: "Paisa", arenas: ["money"] },
  { id: "self", emoji: "🪞", en: "Self-belief & feelings", hi: "Khud se rishta", arenas: ["self"] },
] as const;
export type LifeArea = (typeof LIFE_AREAS)[number]["id"];

/** Everyday arenas that fit anyone's life, always in the mix. */
const GENERAL_ARENAS = ["strangers", "neighbourhood", "service"];

export const isLifeStage = (s: unknown): s is LifeStage => typeof s === "string" && LIFE_STAGES.some((x) => x.id === s);
export const cleanAreas = (a: unknown): LifeArea[] =>
  Array.isArray(a) ? LIFE_AREAS.filter((x) => a.includes(x.id)).map((x) => x.id) : [];

/**
 * Arena ids to draw scenarios from. With no areas chosen, everything except
 * office/work settings (unless the person works or runs a business).
 */
export function arenasFor(areas: readonly string[], stage?: string | null): string[] {
  const picked = LIFE_AREAS.filter((a) => areas.includes(a.id)).flatMap((a) => [...a.arenas]);
  if (picked.length) return [...new Set([...picked, ...GENERAL_ARENAS])];
  const all = ["family", "friends", "online", "partner", "study", "team", "health", "money", "self", ...GENERAL_ARENAS];
  return stage === "working" || stage === "business" ? [...all, "work"] : all;
}

/** One line for the AI about the person's life (no personal details, only these choices). */
export function lifeContextLine(stage: string | null | undefined, areas: readonly string[]): string | null {
  const st = LIFE_STAGES.find((s) => s.id === stage);
  const ar = LIFE_AREAS.filter((a) => areas.includes(a.id)).map((a) => a.en);
  if (!st && !ar.length) return null;
  return `${st ? `Life stage: ${st.en}. ` : ""}${ar.length ? `Wants to grow in: ${ar.join(", ")}.` : ""}`;
}
