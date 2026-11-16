"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, cx } from "./ui";

type Theme = "system" | "light" | "dark";
const OPTIONS: { id: Theme; label: string; icon: typeof Sun }[] = [
  { id: "system", label: "Auto", icon: Monitor },
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
];

/** Appearance setting: follow the device, or always light / always dark. Remembered on this device. */
export function ThemeSetting() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    setTheme(t === "dark" || t === "light" ? t : "system");
  }, []);

  const choose = (next: Theme) => {
    setTheme(next);
    const root = document.documentElement;
    try {
      if (next === "system") {
        delete root.dataset.theme;
        localStorage.removeItem("p90-theme");
      } else {
        root.dataset.theme = next;
        localStorage.setItem("p90-theme", next);
      }
    } catch {}
  };

  return (
    <Card className="mb-6 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-[15px] font-bold">Appearance</h2>
      <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-1 rounded-full bg-bg p-1">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={theme === o.id}
            onClick={() => choose(o.id)}
            className={cx(
              "inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition",
              theme === o.id ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink",
            )}
          >
            <o.icon className="size-4" />
            {o.label}
          </button>
        ))}
      </div>
    </Card>
  );
}
