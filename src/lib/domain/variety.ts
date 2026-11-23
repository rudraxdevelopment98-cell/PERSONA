/**
 * Variety engine. Picks a fresh "creative recipe" for each day so stories,
 * scenarios, challenges, reflections and check-ins don't feel repetitive.
 * Choices are deterministic per user + day (stable on retries) and avoid
 * anything used recently.
 *
 * Stories run as weekly seasons: one world and cast for 7 days, a new
 * episode each day that ends on a hook, and a finale on the last day.
 */

export type Pick = { id: string; label: string; detail: string };

export const WORLDS = [
  { id: "street_food", label: "🍢 Street-food stall", detail: "a family street-food stall in Mumbai during the evening rush" },
  { id: "launch_control", label: "🚀 Satellite launch", detail: "a satellite launch control room in the final 48 hours before lift-off" },
  { id: "college_fest", label: "🎤 College fest", detail: "the backstage chaos of a big college cultural fest" },
  { id: "homestay", label: "🏔️ Hill homestay", detail: "a hill-station homestay cut off by a landslide, guests and hosts stuck together" },
  { id: "cricket", label: "🏏 Cricket dressing room", detail: "an under-19 state cricket team's dressing room during a knockout tournament" },
  { id: "night_shift", label: "🏥 Hospital night shift", detail: "a busy city hospital's night shift" },
  { id: "wedding", label: "💃 Family wedding", detail: "a big three-day family wedding where everyone has an opinion" },
  { id: "esports", label: "🎮 Esports bootcamp", detail: "an esports team's bootcamp before a national final" },
  { id: "pitch_day", label: "💡 Startup pitch week", detail: "a tiny startup in the week before investor pitch day" },
  { id: "trek", label: "🥾 Himalayan trek", detail: "a group of strangers on a 10-day Himalayan trek" },
  { id: "newsroom", label: "📰 Election-night newsroom", detail: "a TV newsroom on election-results night" },
  { id: "film_set", label: "🎬 Film set", detail: "a low-budget film shoot running out of time and money" },
  { id: "cyber_war_room", label: "🛡️ Cyber-attack war room", detail: "a company's security operations centre during a live ransomware attack" },
  { id: "theatre", label: "🎭 Theatre group", detail: "an amateur theatre group in the last week before opening night" },
  { id: "kitchen", label: "👩‍🍳 Restaurant kitchen", detail: "a high-pressure restaurant kitchen during a critic's visit" },
  { id: "coaching_hostel", label: "📚 Coaching hostel", detail: "a competitive-exam coaching hostel months before the big exam" },
  { id: "mun", label: "🌍 Model UN summit", detail: "an international Model UN conference with a surprise crisis session" },
  { id: "panchayat", label: "🏡 Village council", detail: "a village council deciding how to spend a one-time development grant" },
  { id: "rescue", label: "🌊 Beach rescue team", detail: "a lifeguard and beach-rescue team during monsoon season" },
  { id: "mars", label: "🪐 Mars greenhouse (near future)", detail: "a small crew running a greenhouse on a Mars research base in 2061" },
  { id: "printing_press", label: "🗞️ 1920s printing press", detail: "a printing press in 1920s Kolkata publishing a risky newspaper" },
  { id: "road_trip", label: "🚐 Road trip", detail: "four friends on a cross-country road trip that keeps going wrong" },
  { id: "band", label: "🎸 Indie band tour", detail: "an indie band on its first small-city tour" },
  { id: "detective", label: "🔎 Small-town mystery", detail: "a small hill town where a young assistant helps solve a puzzling disappearance" },
] as const satisfies readonly Pick[];

export const GENRES = [
  { id: "thriller", label: "Thriller", detail: "tense, fast, a ticking clock" },
  { id: "comedy", label: "Comedy-drama", detail: "warm and funny, with real stakes underneath" },
  { id: "mystery", label: "Mystery", detail: "clues, wrong assumptions and a reveal" },
  { id: "sports", label: "Sports drama", detail: "pressure, teamwork, the big moment" },
  { id: "family", label: "Family drama", detail: "loyalty, expectations and old patterns" },
  { id: "adventure", label: "Adventure", detail: "danger, survival and quick decisions" },
  { id: "workplace", label: "Workplace drama", detail: "politics, ambition and credit" },
  { id: "coming_of_age", label: "Coming of age", detail: "firsts, identity and finding a voice" },
  { id: "sci_fi", label: "Near-future sci-fi", detail: "a believable future where people are still people" },
] as const satisfies readonly Pick[];

export const DEVICES = [
  { id: "ticking_clock", label: "Ticking clock", detail: "each episode happens against a deadline" },
  { id: "two_views", label: "Two points of view", detail: "alternate between the protagonist and one other character" },
  { id: "mentor_eyes", label: "Through a mentor's eyes", detail: "an older character watches the protagonist grow" },
  { id: "wrong_assumption", label: "Wrong assumption", detail: "a belief the protagonist holds turns out to be wrong" },
  { id: "secret", label: "A secret", detail: "someone is hiding something that changes the stakes" },
  { id: "rivals", label: "Rivals to allies", detail: "a rival slowly becomes an unlikely ally" },
] as const satisfies readonly Pick[];

/** Scenario formats: all fit the same "choose an option + explain why" screen. */
export const SCENARIO_FORMATS = [
  { id: "dilemma", label: "Dilemma", detail: "A tricky situation: what do you do? Options are actions." },
  { id: "read_the_room", label: "Read the room", detail: "What is the other person really feeling or needing? Options are interpretations; the strong one reads the subtle cues correctly." },
  { id: "best_words", label: "Pick your words", detail: "Which exact line would you say? Options are short lines of dialogue in quotes." },
  { id: "thinking_trap", label: "Spot the trap", detail: "A character's inner monologue contains a thinking trap. Options are ways to reframe it; the strong one is the most balanced, realistic reframe." },
  { id: "what_next", label: "What happens next?", detail: "Predict the most likely outcome of someone's move. Options are outcomes; the strong one is the most realistic prediction." },
  { id: "repair", label: "Repair it", detail: "Something has already gone wrong. Options are ways to repair it." },
  { id: "advise", label: "Advise a friend", detail: "A friend asks for advice about this skill. Options are pieces of advice." },
  { id: "first_instinct", label: "10-second call", detail: "No time to think: a fast moment that needs an instinctive response. Keep it very short." },
] as const satisfies readonly Pick[];

export const ARENAS = [
  { id: "work", label: "Work", detail: "at work, in a shop or in their own business" },
  { id: "study", label: "Studies", detail: "at college, school, coaching or while preparing for an exam" },
  { id: "partner", label: "Love life", detail: "with a partner, spouse or someone they like" },
  { id: "health", label: "Health & habits", detail: "about sleep, food, fitness, screen time or a doctor's advice" },
  { id: "self", label: "Inner voice", detail: "alone, with their own thoughts, fears and self-talk" },
  { id: "family", label: "Family", detail: "with parents, siblings or relatives" },
  { id: "friends", label: "Friends", detail: "with close friends" },
  { id: "strangers", label: "Strangers", detail: "with a stranger in public (shop, train, queue, event)" },
  { id: "online", label: "Online", detail: "in a group chat, on social media or in an online meeting" },
  { id: "money", label: "Money", detail: "about money, prices, lending or splitting costs" },
  { id: "team", label: "Team", detail: "in a team, club or group project" },
  { id: "neighbourhood", label: "Neighbourhood", detail: "with neighbours, a landlord or the local community" },
  { id: "service", label: "Customer side", detail: "as a customer dealing with a service, delivery or support desk" },
] as const satisfies readonly Pick[];

export const CHALLENGE_TYPES = [
  { id: "micro_courage", label: "Micro-courage", detail: "one small brave act that takes under a minute" },
  { id: "stranger", label: "Talk to a stranger", detail: "a short, friendly exchange with someone you don't know" },
  { id: "say_it", label: "Say the thing", detail: "say one honest sentence you would normally swallow" },
  { id: "experiment", label: "Social experiment", detail: "try something and observe what actually happens versus what you feared" },
  { id: "lead", label: "Take the lead", detail: "step up and organise or decide something for a group" },
  { id: "no", label: "Kind no", detail: "decline one request politely and without over-explaining" },
  { id: "observe", label: "Detective mode", detail: "notice and note specific behaviours in others today (body language, emotions, power)" },
  { id: "decide_fast", label: "Two-minute decisions", detail: "make every small decision today within two minutes, without asking anyone" },
  { id: "teach", label: "Teach it", detail: "explain something you know to someone else, clearly and confidently" },
  { id: "kindness", label: "Bold kindness", detail: "give specific, sincere appreciation or help to someone, out loud" },
  { id: "digital", label: "Send the message", detail: "send one message, email or comment you have been putting off" },
] as const satisfies readonly Pick[];

export const CHECKIN_LENSES = [
  { id: "energy", label: "Energy & body", detail: "sleep, energy, physical tension and how they affected behaviour" },
  { id: "people", label: "People today", detail: "the people they dealt with and how those interactions felt" },
  { id: "courage", label: "Moment of courage", detail: "one moment they were brave, or nearly were" },
  { id: "decision_replay", label: "Decision replay", detail: "replaying one recent decision: what they chose and why" },
  { id: "future_self", label: "Future self", detail: "what their day-90 self would notice about today" },
  { id: "wins", label: "Small wins", detail: "progress, wins and things that went better than expected" },
  { id: "fear_forecast", label: "Fear forecast", detail: "what they are dreading in the next 24 hours and how likely the worst case really is" },
  { id: "conversation", label: "Conversation replay", detail: "one conversation they'd like to replay or redo" },
] as const satisfies readonly Pick[];

export const REFLECTION_STYLES = [
  { id: "connect", label: "Connect the dots", detail: "link the story, scenarios and challenge to the user's own life" },
  { id: "letter", label: "Note to self", detail: "questions that invite a short note to their future self" },
  { id: "rate_and_why", label: "Rate and why", detail: "questions that ask for a quick rating plus the reason" },
  { id: "if_then", label: "If-then plan", detail: "questions that build a concrete if-then plan for tomorrow" },
  { id: "character", label: "Character lens", detail: "questions that compare the user to a character from today's story" },
  { id: "evidence", label: "Evidence check", detail: "questions that test a belief against real evidence from today" },
] as const satisfies readonly Pick[];

/** Pressure twists that make Decision and Communication Lab moments feel alive. */
export const TWISTS = [
  { id: "clock", label: "Ticking clock", detail: "there are only minutes to respond" },
  { id: "audience", label: "Audience", detail: "other people are watching how you handle it" },
  { id: "admired", label: "Someone you admire", detail: "the other person is someone you really respect" },
  { id: "secret", label: "A secret", detail: "you know something the others don't" },
  { id: "money", label: "Money on the line", detail: "real money is at stake" },
  { id: "friendship", label: "Friendship at risk", detail: "a friendship could crack either way" },
  { id: "unfair", label: "It's unfair", detail: "something unfair just happened to you or someone else" },
  { id: "first_time", label: "First time", detail: "you've never been in this situation before" },
  { id: "plot_twist", label: "Plot twist", detail: "new information arrives halfway and flips the situation" },
  { id: "power", label: "Power gap", detail: "the other person has much more power than you" },
  { id: "funny", label: "Awkward-funny", detail: "the situation is a little absurd and funny, but still matters" },
  { id: "public", label: "Goes public", detail: "whatever you do could end up in a group chat or online" },
] as const satisfies readonly Pick[];

/** Day 4 of every season is a Mirror day: content may reflect the user's real situation directly. */
export const isMirrorDay = (day: number) => seasonFor(day).position === 4;

/** 7-day seasons; day 90 closes the last one. */
export function seasonFor(day: number) {
  const d = Math.max(1, Math.min(90, Math.round(day)));
  const season = Math.ceil(d / 7);
  const position = ((d - 1) % 7) + 1;
  return { season, position, finale: position === 7 || d === 90 };
}

/** Small deterministic hash (FNV-1a) so picks are stable for a user and day. */
export function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Picks n distinct items, preferring ones not in `avoid`. */
export function pickDistinct<T extends { id: string }>(pool: readonly T[], seed: string, avoid: readonly string[], n = 1): T[] {
  const rank = (items: T[]) => [...items].sort((a, b) => hash(`${seed}:${a.id}`) - hash(`${seed}:${b.id}`));
  // Fresh items always come first; recently used ones only fill any gap.
  const fresh = rank(pool.filter((p) => !avoid.includes(p.id)));
  const used = rank(pool.filter((p) => avoid.includes(p.id)));
  return [...fresh, ...used].slice(0, n);
}

export type Recent = {
  worlds: string[];
  genres: string[];
  formats: string[];
  arenas: string[];
  challenges: string[];
  reflections: string[];
  lenses: string[];
};

export type SeasonRecipe = { world: string; genre: string; device: string };
export type DayRecipe = { formats: string[]; arenas: string[]; challenge: string; reflection: string };

export function newSeason(userId: string, season: number, recent: Pick2<Recent, "worlds" | "genres">, preferredWorld?: string | null): SeasonRecipe {
  const seed = `${userId}:season:${season}`;
  const world = preferredWorld && WORLDS.some((w) => w.id === preferredWorld) ? preferredWorld : pickDistinct(WORLDS, seed, recent.worlds)[0].id;
  return {
    world,
    genre: pickDistinct(GENRES, `${seed}:g`, recent.genres)[0].id,
    device: pickDistinct(DEVICES, `${seed}:d`, [])[0].id,
  };
}

type Pick2<T, K extends keyof T> = { [P in K]: T[P] };

export function dayRecipe(
  userId: string,
  day: number,
  recent: Pick2<Recent, "formats" | "arenas" | "challenges" | "reflections">,
  /** Arena ids that fit this person's life (from their life areas); empty = all. */
  allowedArenas: readonly string[] = [],
): DayRecipe {
  const seed = `${userId}:day:${day}`;
  return {
    formats: pickDistinct(SCENARIO_FORMATS, `${seed}:f`, recent.formats, 3).map((p) => p.id),
    arenas: pickDistinct(allowedArenas.length ? ARENAS.filter((x) => allowedArenas.includes(x.id)) : ARENAS, `${seed}:a`, recent.arenas, 3).map((p) => p.id),
    challenge: pickDistinct(CHALLENGE_TYPES, `${seed}:c`, recent.challenges)[0].id,
    reflection: pickDistinct(REFLECTION_STYLES, `${seed}:r`, recent.reflections)[0].id,
  };
}

export function checkinLens(userId: string, day: number, recentLenses: string[]): string {
  return pickDistinct(CHECKIN_LENSES, `${userId}:lens:${day}`, recentLenses)[0].id;
}

/** Three worlds the user can choose from for their next season. */
export function nextWorldOptions(userId: string, season: number, recentWorlds: string[]): string[] {
  return pickDistinct(WORLDS, `${userId}:next:${season}`, recentWorlds, 3).map((w) => w.id);
}

export const byId = <T extends { id: string }>(pool: readonly T[], id: string | null | undefined) => pool.find((p) => p.id === id);
