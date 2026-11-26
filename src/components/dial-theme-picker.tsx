"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { DEFAULT_DIAL, DIAL_STORAGE_KEY, DIAL_THEMES } from "@/lib/domain/dial-themes";
import type { Dimension } from "@/lib/domain/dimensions";
import { SkillsDial } from "./skills-dial";
import { cx } from "./ui";
import { useT } from "@/lib/i18n/client";

const SAMPLE = [
  { dimension: "confidence" as Dimension, current: 67, baseline: 44 },
  { dimension: "communication" as Dimension, current: 44, baseline: 44 },
];

/** Grid of dial styles; the choice is saved per device and applied on Progress. */
export function DialThemePicker() {
  const t = useT();
  const [sel, setSel] = useState(DEFAULT_DIAL);
  useEffect(() => {
    try {
      setSel(localStorage.getItem(DIAL_STORAGE_KEY) || DEFAULT_DIAL);
    } catch {
      /* ignore */
    }
  }, []);
  const choose = (id: string) => {
    setSel(id);
    try {
      localStorage.setItem(DIAL_STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event("p90-dial-theme"));
  };
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {DIAL_THEMES.map((th) => (
        <button
          key={th.id}
          type="button"
          onClick={() => choose(th.id)}
          className={cx("relative overflow-hidden rounded-2xl border-2 p-3 text-left transition", sel === th.id ? "border-primary bg-primary-soft/40" : "border-line hover:border-line-strong")}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">{t(th.name)}</span>
            {sel === th.id && <Check className="size-4 text-primary" />}
          </div>
          <div className="mt-2 flex min-h-[112px] items-center justify-center">
            <SkillsDial rows={SAMPLE} theme={th.id} preview />
          </div>
        </button>
      ))}
    </div>
  );
}
