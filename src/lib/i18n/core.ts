/**
 * App translation. Source strings (as written in the code) are the keys, so a
 * language without an entry simply shows the original text. `{0}`, `{1}` are
 * filled from the arguments. Text that already has numbers filled in (for
 * example stored in the database) is matched against the `{n}` patterns.
 */
export type Dict = Record<string, string>;
export type TFn = (source: string, ...args: unknown[]) => string;

const fill = (s: string, args: unknown[]) => {
  let out = s;
  for (let i = 0; i < args.length; i++) out = out.split(`{${i}}`).join(String(args[i] ?? ""));
  return out;
};
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

type Pattern = { re: RegExp; to: string };
const patternCache = new WeakMap<Dict, Pattern[]>();
function patternsFor(dict: Dict): Pattern[] {
  let list = patternCache.get(dict);
  if (!list) {
    list = Object.keys(dict)
      .filter((k) => /\{\d\}/.test(k) && /[A-Za-z]{3}/.test(k.replace(/\{\d\}/g, "")))
      .map((k) => ({ re: new RegExp(`^${esc(k).replace(/\\\{(\d)\\\}/g, "(?<p$1>.+?)")}$`), to: dict[k] }));
    patternCache.set(dict, list);
  }
  return list;
}

export function makeT(dict: Dict | null): TFn {
  return (source, ...args) => {
    if (!dict) return fill(source, args);
    const hit = dict[source];
    if (hit) return fill(hit, args);
    if (!args.length && /\d/.test(source) && source.length < 200) {
      for (const p of patternsFor(dict)) {
        const m = p.re.exec(source);
        if (m?.groups) return p.to.replace(/\{(\d)\}/g, (_, n) => m.groups![`p${n}`] ?? "");
      }
    }
    return fill(source, args);
  };
}

/** Languages whose whole interface is translated (others show the original text). */
export const UI_LANGS = ["gu"] as const;
export type UILang = (typeof UI_LANGS)[number];
export const hasUI = (lang: string | null | undefined): lang is UILang => (UI_LANGS as readonly string[]).includes(lang ?? "");
