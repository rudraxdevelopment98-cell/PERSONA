"use client";

import { useState } from "react";
import { BellRing } from "lucide-react";
import { Button, Input } from "./ui";
import { useT } from "@/lib/i18n/client";

/** Downloads a daily repeating calendar event - works with Google, Apple and Outlook calendars. */
export function ReminderButton() {
  const t = useT();
  const [time, setTime] = useState("20:00");
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="sm:w-32" aria-label={t("Reminder time")} />
      <Button
        variant="secondary"
        onClick={() => {
          window.location.href = `/api/reminder?time=${encodeURIComponent(time)}`;
        }}
      >
        <BellRing className="size-4" />{" "}{t("Add daily reminder to calendar")}</Button>
    </div>
  );
}
