/** Quick tags for the optional "today's moment" card at the end of the check-in. */
export const MOMENT_TAGS = [
  { id: "work", label: "💼 Kaam / College" },
  { id: "family", label: "🏠 Family" },
  { id: "friends", label: "🧑‍🤝‍🧑 Dost" },
  { id: "love", label: "💞 Rishta" },
  { id: "money", label: "💸 Paisa" },
  { id: "health", label: "🩺 Health / Neend" },
  { id: "self", label: "🪞 Khud se" },
  { id: "nothing", label: "😌 Kuch khaas nahi" },
] as const;

export type MomentTag = (typeof MOMENT_TAGS)[number]["id"];
export const MOMENT_TAG_IDS = MOMENT_TAGS.map((t) => t.id) as [MomentTag, ...MomentTag[]];
export const momentTagLabel = (id: string) => MOMENT_TAGS.find((t) => t.id === id)?.label.replace(/^\S+\s/, "") ?? id;
