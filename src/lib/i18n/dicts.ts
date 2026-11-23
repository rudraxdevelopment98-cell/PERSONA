import type { Dict } from "./core";
import en from "./dicts/en.json";
import gu from "./dicts/gu.json";
import hi from "./dicts/hi.json";

/**
 * en: English for the screens whose source text is written in Hinglish.
 * Hinglish users see the source text as written.
 */
const DICTS: Record<string, Dict> = { en, gu, hi };

export const dictFor = (lang: string | null | undefined): Dict | null => (lang ? DICTS[lang] ?? null : null);
