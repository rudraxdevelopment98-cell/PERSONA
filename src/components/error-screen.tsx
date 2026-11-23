"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { reportError } from "@/lib/client/report-error";
import { useT } from "@/lib/i18n/client";

/** Friendly crash screen: reports the error once and offers a retry instead of a blank page. */
export function ErrorScreen({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  useEffect(() => {
    reportError(error.digest ? `${error.message} (digest ${error.digest})` : error.message);
  }, [error]);
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col items-center justify-center px-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-3xl bg-accent-soft text-2xl">😕</span>
      <h1 className="mt-4 text-xl font-extrabold">{t("Kuch gadbad ho gayi")}</h1>
      <p className="mt-2 text-sm text-muted">{t("Hume pata chal gaya hai aur hum theek kar rahe hain. Tumhara data safe hai.")}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white active:scale-95"
      >
        <RotateCcw className="size-4" />{" "}{t("Dobara try karo")}</button>
      <a href="/dashboard" className="mt-3 text-sm font-semibold text-primary">{t("Home par jao")}</a>
    </div>
  );
}
