"use client";

import { useState, useTransition } from "react";
import { setRemindersAction } from "@/app/(app)/friends/actions";
import { useT } from "@/lib/i18n/client";

/** Opt in/out of the daily evening reminder (sent only if today's session isn't done). */
export function ReminderToggle({ initial }: { initial: boolean }) {
  const t = useT();
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <label className="flex items-start gap-3 text-sm">
      <input
        type="checkbox"
        className="mt-0.5 size-4 accent-[var(--color-primary)]"
        checked={on}
        disabled={pending}
        onChange={(e) => {
          const v = e.target.checked;
          setOn(v);
          start(async () => {
            const res = await setRemindersAction(v);
            if (res.error) setOn(!v);
          });
        }}
      />
      <span>
        <span className="block font-semibold">{t("Daily evening reminder")}</span>
        <span className="block text-xs text-muted">{t("One evening nudge, only if you missed the day.")}</span>
      </span>
    </label>
  );
}
