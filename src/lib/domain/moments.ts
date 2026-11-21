import { DIMENSION_META, type Dimension } from "./dimensions";
import type { ShareItem } from "./social";

/** Cover themes for profile banners and moment cards. Colours work in light and dark mode. */
export const COVERS = [
  // Shades of the two brand colours only (ids kept so saved covers still work).
  { id: "teal", label: "Persona", bg: "linear-gradient(160deg,#2dd4bf 0%,#0e9f8a 45%,#26364a 100%)" },
  { id: "sunrise", label: "Mint", bg: "linear-gradient(160deg,#99f6e4 0%,#2dd4bf 45%,#0e9f8a 100%)" },
  { id: "forest", label: "Lagoon", bg: "linear-gradient(160deg,#14b8a6 0%,#0b7d6d 55%,#064e45 100%)" },
  { id: "ocean", label: "Ocean", bg: "linear-gradient(160deg,#0e9f8a 0%,#3e5878 60%,#26364a 100%)" },
  { id: "neon", label: "Steel", bg: "linear-gradient(160deg,#9fb3d1 0%,#5a7ba8 50%,#3e5878 100%)" },
  { id: "candy", label: "Dusk", bg: "linear-gradient(160deg,#5a7ba8 0%,#3e5878 50%,#26364a 100%)" },
  { id: "fire", label: "Navy", bg: "linear-gradient(160deg,#3e5878 0%,#26364a 55%,#141d29 100%)" },
  { id: "midnight", label: "Midnight", bg: "linear-gradient(160deg,#26364a 0%,#141d29 55%,#0b1018 100%)" },
] as const;
export type CoverId = (typeof COVERS)[number]["id"];
export const DEFAULT_COVER: CoverId = "teal";
export const coverBg = (id: string | null | undefined) => (COVERS.find((c) => c.id === id) ?? COVERS.find((c) => c.id === DEFAULT_COVER)!).bg;
export const isCover = (id: unknown): id is CoverId => typeof id === "string" && COVERS.some((c) => c.id === id);

/** Emoji avatars people can pick (no photos: nothing personal is uploaded). */
export const AVATAR_EMOJIS = [
  "🦁", "🐯", "🦊", "🐼", "🐨", "🐸", "🦉", "🐺", "🦄", "🐬", "🦋", "🐝",
  "🌻", "🌙", "⭐", "🔥", "⚡", "🌊", "🍀", "🎯", "🚀", "🎧", "🎨", "📚",
  "🧠", "💎", "👑", "🛡️", "🏔️", "🌈", "😎", "🤓", "🥷", "🧘", "🦸", "🤠",
] as const;
export const isAvatarEmoji = (e: unknown): e is string => typeof e === "string" && (AVATAR_EMOJIS as readonly string[]).includes(e);

export const MAX_PINNED = 3;
export const BIO_MAX = 80;
export const CAPTION_MAX = 100;

export const MOMENT_KINDS = ["day", "streak", "badge", "level", "challenge", "progress", "growth"] as const;
export type MomentKind = (typeof MOMENT_KINDS)[number];

/** Which sharing setting decides who sees each kind of moment. */
export const MOMENT_ITEM: Record<MomentKind, ShareItem> = {
  day: "activity",
  streak: "activity",
  progress: "activity",
  badge: "badges",
  level: "xp",
  challenge: "challenges",
  growth: "growth",
};

export type MomentData = {
  day?: number;
  sessions?: number;
  streak?: number;
  badge?: string;
  icon?: string;
  level?: number;
  levelName?: string;
  challenges?: number;
  pct?: number;
  dimension?: string;
  delta?: number;
};

/** The words on a moment card, built only from the server-made data. */
export function momentFace(kind: MomentKind, d: MomentData): { sticker: string; big: string; line: string } {
  switch (kind) {
    case "day":
      return { sticker: "✅", big: `Day ${d.day ?? 1}`, line: "done! Aaj ka episode complete" };
    case "streak":
      return { sticker: "🔥", big: `${d.streak ?? 0}`, line: `day streak · rukna mana hai` };
    case "badge":
      return { sticker: "🏅", big: d.badge ?? "New badge", line: "badge unlocked" };
    case "level":
      return { sticker: "⚡", big: `Level ${d.level ?? 1}`, line: d.levelName ? `Now a ${d.levelName}` : "level up" };
    case "challenge":
      return { sticker: "🎯", big: `${d.challenges ?? 0}`, line: "real-world challenges done" };
    case "progress":
      return { sticker: "🗺️", big: `${d.pct ?? 0}%`, line: `of the 90-day journey · Day ${d.day ?? 0}` };
    case "growth": {
      const name = d.dimension && d.dimension in DIMENSION_META ? DIMENSION_META[d.dimension as Dimension].short : "Skill";
      return { sticker: "📈", big: `+${d.delta ?? 0}`, line: `${name} since day 1` };
    }
  }
}

export const MOMENT_LABEL: Record<MomentKind, string> = {
  day: "Today's episode",
  streak: "Streak",
  badge: "New badge",
  level: "Level",
  challenge: "Challenges",
  progress: "Journey",
  growth: "Growth",
};

export const REACTIONS = [
  { id: "fire", emoji: "🔥" },
  { id: "heart", emoji: "❤️" },
  { id: "clap", emoji: "👏" },
  { id: "strong", emoji: "💪" },
  { id: "proud", emoji: "🌟" },
  { id: "wow", emoji: "😮" },
] as const;
export type ReactionId = (typeof REACTIONS)[number]["id"];
export const reactionEmoji = (id: string | null | undefined) => REACTIONS.find((r) => r.id === id)?.emoji ?? null;

/** Friend streak: consecutive days (ending today, or yesterday if today isn't done by both) where both showed up. */
export function duoStreak(mine: string[], theirs: string[], today: string): { streak: number; todayMe: boolean; todayThem: boolean } {
  const a = new Set(mine);
  const b = new Set(theirs);
  const dayStr = (offset: number) => new Date(Date.parse(`${today}T00:00:00Z`) - offset * 86_400_000).toISOString().slice(0, 10);
  const both = (d: string) => a.has(d) && b.has(d);
  const start = both(today) ? 0 : 1;
  let streak = 0;
  while (both(dayStr(start + streak))) streak++;
  return { streak, todayMe: a.has(today), todayThem: b.has(today) };
}

/** Milestone emoji next to a friend streak. */
export function streakMark(n: number) {
  if (n >= 90) return "👑";
  if (n >= 30) return "💯";
  if (n >= 7) return "🔥";
  if (n >= 3) return "✨";
  return "";
}
