import type { Dict } from "./core";
import gu from "./dicts/gu.json";

const DICTS: Record<string, Dict> = { gu };

export const dictFor = (lang: string | null | undefined): Dict | null => (lang ? DICTS[lang] ?? null : null);
