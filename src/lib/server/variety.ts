import "server-only";
import type { Db } from "@/lib/db/server";
import {
  ARENAS,
  CHALLENGE_TYPES,
  DEVICES,
  GENRES,
  REFLECTION_STYLES,
  SCENARIO_FORMATS,
  WORLDS,
  byId,
  dayRecipe,
  newSeason,
  nextWorldOptions,
  seasonFor,
  type DayRecipe,
  type SeasonRecipe,
} from "@/lib/domain/variety";

/** What a session stores about its variety and story season. */
export type SessionVariety = SeasonRecipe &
  DayRecipe & {
    season: number;
    episode: number;
    finale: boolean;
    cast?: string;
    arc?: string;
    episode_title?: string;
    episode_summary?: string;
    teaser?: string;
    next_world_options?: string[];
  };

type PastSession = { day_number: number; variety: SessionVariety | null; challenge: { title?: string } | null; scenarios: { title?: string }[] | null };

/** Plans today's recipe from the user's recent history. */
export async function planDay(db: Db, userId: string, day: number, preferredWorld: string | null) {
  const { data } = await db
    .from("daily_sessions")
    .select("day_number, variety, challenge, scenarios")
    .eq("user_id", userId)
    .lt("day_number", day)
    .order("day_number", { ascending: false })
    .limit(21);
  const past = (data ?? []) as PastSession[];
  const recentV = past.map((p) => p.variety).filter(Boolean) as SessionVariety[];
  const last = (n: number, f: (v: SessionVariety) => string | string[] | undefined) =>
    recentV.slice(0, n).flatMap((v) => f(v) ?? []) as string[];

  const { season, finale } = seasonFor(day);
  const seasonSoFar = past
    .filter((p) => p.variety && p.variety.season === season)
    .sort((a, b) => a.day_number - b.day_number);
  const first = seasonSoFar[0]?.variety ?? null;

  const seasonRecipe: SeasonRecipe = first
    ? { world: first.world, genre: first.genre, device: first.device }
    : newSeason(userId, season, { worlds: last(21, (v) => v.world), genres: last(14, (v) => v.genre) }, preferredWorld);

  const recipe = dayRecipe(userId, day, {
    formats: last(1, (v) => v.formats),
    arenas: last(2, (v) => v.arenas),
    challenges: last(5, (v) => v.challenge),
    reflections: last(3, (v) => v.reflection),
  });

  const variety: SessionVariety = {
    ...seasonRecipe,
    ...recipe,
    season,
    episode: seasonSoFar.length + 1,
    finale,
    cast: first?.cast,
    arc: first?.arc,
    next_world_options: finale ? nextWorldOptions(userId, season, [...last(21, (v) => v.world), seasonRecipe.world]) : undefined,
  };

  const previously = seasonSoFar
    .map((p) => p.variety?.episode_summary && `Episode ${p.variety.episode}${p.variety.episode_title ? ` "${p.variety.episode_title}"` : ""}: ${p.variety.episode_summary}`)
    .filter(Boolean) as string[];

  return {
    variety,
    previously,
    usedChallenges: past.slice(0, 10).map((p) => p.challenge?.title).filter(Boolean) as string[],
    usedScenarios: past.slice(0, 7).flatMap((p) => (p.scenarios ?? []).map((s) => s.title)).filter(Boolean) as string[],
  };
}

/** The recipe as instructions for the session planner. */
export function recipeText(v: SessionVariety, previously: string[]): string {
  const world = byId(WORLDS, v.world);
  const genre = byId(GENRES, v.genre);
  const device = byId(DEVICES, v.device);
  const lines = [
    `## Creative recipe for today`,
    `Story: Season ${v.season}, Episode ${v.episode}${v.finale ? " - SEASON FINALE" : ""}.`,
    `- World: ${world?.detail}`,
    `- Genre: ${genre?.label} (${genre?.detail})`,
    `- Storytelling device: ${device?.label} (${device?.detail})`,
  ];
  if (v.episode > 1 && v.cast) lines.push(`- Recurring cast (keep them):\n${v.cast}`);
  if (v.episode > 1 && v.arc) lines.push(`- Season arc: ${v.arc}`);
  if (previously.length) lines.push(`- Previously this season:\n${previously.map((p) => `  ${p}`).join("\n")}`);
  lines.push(`Scenarios (in this order):`);
  v.formats.forEach((f, i) => {
    const fmt = byId(SCENARIO_FORMATS, f);
    const arena = byId(ARENAS, v.arenas[i]);
    lines.push(`  ${i + 1}. Format "${fmt?.label}": ${fmt?.detail} Arena: ${arena?.detail}.`);
  });
  const ch = byId(CHALLENGE_TYPES, v.challenge);
  const rf = byId(REFLECTION_STYLES, v.reflection);
  lines.push(`Challenge type: ${ch?.label} - ${ch?.detail}.`);
  lines.push(`Reflection style: ${rf?.label} - ${rf?.detail}.`);
  return lines.join("\n");
}
