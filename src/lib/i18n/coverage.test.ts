import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import gu from "./dicts/gu.json";
import hi from "./dicts/hi.json";

/**
 * Every literal passed to t("...") in the app must have a Gujarati and a Hindi
 * translation, so new screens never silently stay English for those users.
 */
const ROOTS = ["src/app", "src/components"];
const SKIP = ["/admin/", "/(legal)/", "/api/", "opengraph"];

function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return files(p);
    return p.endsWith(".tsx") && !SKIP.some((s) => p.includes(s)) ? [p] : [];
  });
}

function literals(): Map<string, string> {
  const out = new Map<string, string>();
  for (const root of ROOTS)
    for (const f of files(path.join(process.cwd(), root))) {
      const src = fs.readFileSync(f, "utf8");
      for (const m of src.matchAll(/\bt\(\s*("(?:[^"\\]|\\.)*")/g)) {
        const s = JSON.parse(m[1]) as string;
        if (/[A-Za-z]{2}/.test(s) && !out.has(s)) out.set(s, path.relative(process.cwd(), f));
      }
    }
  return out;
}

describe("translation coverage", () => {
  const all = literals();
  for (const [name, dict] of [["Gujarati", gu], ["Hindi", hi]] as const) {
    it(`every UI text has a ${name} translation`, () => {
      const missing = [...all].filter(([s]) => !(dict as Record<string, string>)[s]).map(([s, f]) => `${f}: ${s}`);
      expect(missing, missing.join("\n")).toEqual([]);
    });
  }
});
