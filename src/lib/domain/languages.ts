/**
 * Languages the app speaks. AI content (stories, scenarios, check-ins, feedback,
 * coach, quick cards) is written in the chosen language, and voice input
 * listens in it. `speech` is the BCP-47 tag for speech recognition and voices.
 */
export const LANGUAGES = [
  { id: "en", label: "English", english: "English", short: "EN", speech: "en-IN", script: "Latin", hint: "Stories, feedback and coach in English" },
  { id: "hinglish", label: "Hinglish", english: "Hinglish", short: "Hing", speech: "hi-IN", script: "Latin", hint: "Roman Hindi + English mix" },
  { id: "hi", label: "हिन्दी", english: "Hindi", short: "हिं", speech: "hi-IN", script: "Devanagari", hint: "देवनागरी में हिंदी" },
  { id: "gu", label: "ગુજરાતી", english: "Gujarati", short: "ગુ", speech: "gu-IN", script: "Gujarati", hint: "ગુજરાતીમાં વાર્તા, ફીડબેક અને કોચ" },
] as const;

export type Language = (typeof LANGUAGES)[number]["id"];
export const LANGUAGE_IDS = LANGUAGES.map((l) => l.id) as [Language, ...Language[]];
export const isLanguage = (v: unknown): v is Language => typeof v === "string" && (LANGUAGE_IDS as string[]).includes(v);
export const languageInfo = (id: string | null | undefined) => LANGUAGES.find((l) => l.id === id) ?? LANGUAGES[0];

/** Hindi-belt languages fall back to Hinglish content where no translation exists; the rest to English. */
export function fallbackLang(id: string | null | undefined): "en" | "hinglish" | "hi" {
  if (id === "hinglish" || id === "hi") return id;
  if (id === "gu") return "hinglish";
  return "en";
}

/** Assessment language: its own translation where one exists, else the closest fallback. */
export const assessLang = (id: string | null | undefined): "en" | "hinglish" | "hi" | "gu" => (id === "gu" ? "gu" : fallbackLang(id));

/** Short confirmation shown after switching. */
export const SAVED_TEXT: Record<Language, string> = {
  en: "Language set to English",
  hinglish: "Language Hinglish ho gayi",
  hi: "भाषा हिन्दी कर दी गई",
  gu: "ભાષા ગુજરાતી થઈ ગઈ",
};
