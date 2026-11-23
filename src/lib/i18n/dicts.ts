import type { Dict } from "./core";
import gu from "./dicts/gu.json";
import hi from "./dicts/hi.json";

const DICTS: Record<string, Dict> = { gu, hi };

export const dictFor = (lang: string | null | undefined): Dict | null => (lang ? DICTS[lang] ?? null : null);
