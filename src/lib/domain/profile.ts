/** Public-profile rules shared by client and server. */

/** 3–20 chars: lowercase letters, digits, underscore. Must contain a letter. */
export const USERNAME_RE = /^(?=.*[a-z])[a-z0-9_]{3,20}$/;

const RESERVED = new Set([
  "admin", "api", "app", "me", "u", "user", "users", "settings", "setting", "friends", "friend", "circles", "circle",
  "pricing", "about", "help", "support", "persona", "persona90", "root", "null", "undefined", "login", "signup",
  "auth", "privacy", "terms", "refund", "guide", "coach", "journal", "progress", "assessment", "today", "home", "inbox",
  "search", "explore", "discover", "new", "edit", "delete", "report", "block", "official", "team", "staff", "mod",
]);

export type PublicItem = "level" | "streak" | "badges" | "bio" | "areas" | "scores";

/** Items a person may choose to show on their public profile. Name + avatar are always shown. */
export const PUBLIC_ITEMS: { id: PublicItem; label: string; hint: string }[] = [
  { id: "level", label: "Level & XP", hint: "Your level and total XP" },
  { id: "streak", label: "Streak", hint: "Current and best streak" },
  { id: "badges", label: "Badges", hint: "Badges you have earned" },
  { id: "bio", label: "Bio", hint: "Your short intro" },
  { id: "areas", label: "What you're working on", hint: "Your chosen parts of life" },
  { id: "scores", label: "Skill scores", hint: "Your 10 development scores — more personal" },
];

export const PUBLIC_ITEM_IDS = PUBLIC_ITEMS.map((i) => i.id);
export const DEFAULT_PUBLIC_ITEMS: PublicItem[] = ["level", "streak", "badges"];

export function cleanUsername(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().toLowerCase() : "";
}

/** Returns an error message, or null when the handle is well-formed and allowed. */
export function usernameError(handle: string): string | null {
  if (!handle) return "Pick a username.";
  if (!USERNAME_RE.test(handle)) return "3–20 characters: lowercase letters, numbers and _ , with at least one letter.";
  if (RESERVED.has(handle)) return "That username is reserved. Try another.";
  return null;
}

export function cleanPublicItems(raw: unknown): PublicItem[] {
  if (!Array.isArray(raw)) return [];
  return PUBLIC_ITEM_IDS.filter((id) => raw.includes(id));
}
