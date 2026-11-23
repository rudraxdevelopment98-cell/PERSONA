"use client";

import { Download, PlusSquare, Share, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";
import { isStandalone, platform, readStore, type Platform } from "@/lib/client/app-context";
import { Button, cx } from "./ui";
import { useT } from "@/lib/i18n/client";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
const DISMISS = "p90-install-dismissed";

/** The browser's install prompt is captured early (see ServiceWorker) and kept here. */
function deferred(): InstallEvent | null {
  return (window as unknown as { __p90Install?: InstallEvent | null }).__p90Install ?? null;
}

/**
 * "Install the app" card: one tap on Android/desktop Chrome, two steps on iPhone.
 * Hidden inside the installed app, the Play Store app, or for a week after "not now".
 */
export function InstallApp({ variant = "card" }: { variant?: "card" | "row" }) {
  const t = useT();
  const [show, setShow] = useState(false);
  const [os, setOs] = useState<Platform>("desktop");
  const [iosSteps, setIosSteps] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (isStandalone() || readStore()) return;
    let dismissed = false;
    try {
      dismissed = variant === "card" && Date.now() - Number(localStorage.getItem(DISMISS) ?? 0) < 7 * 86_400_000;
    } catch {}
    if (dismissed) return;
    const p = platform();
    setOs(p);
    // iPhone has no prompt (Safari's Share menu instead); others only once the browser offers one.
    setShow(p === "ios" || Boolean(deferred()) || variant === "row");
    const late = () => setShow(true);
    window.addEventListener("p90-install-ready", late);
    return () => {
      window.removeEventListener("p90-install-ready", late);
    };
  }, [variant]);

  if (!show || done) return null;

  const install = async () => {
    const e = deferred();
    if (os === "ios" || !e) return setIosSteps(true);
    await e.prompt();
    const { outcome } = await e.userChoice;
    (window as unknown as { __p90Install?: null }).__p90Install = null;
    if (outcome === "accepted") setDone(true);
  };
  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS, String(Date.now()));
    } catch {}
    setShow(false);
  };

  const steps = (
    <ol className="mt-3 space-y-2 text-sm">
      {os === "ios" ? (
        <>
          <li className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">1</span>{" "}{t("Safari mein neeche")}{" "}<Share className="size-4 text-primary" />{" "}{t("Share dabao")}</li>
          <li className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">2</span> <PlusSquare className="size-4 text-primary" />{" "}{t("“Add to Home Screen” chuno")}</li>
          <li className="text-xs text-muted">{t("Chrome mein ho to pehle ye page Safari mein kholo.")}</li>
        </>
      ) : (
        <li className="text-sm text-muted">{t("Browser menu (⋮) mein “Install app” ya “Add to Home screen” chuno.")}</li>
      )}
    </ol>
  );

  if (variant === "row") {
    return (
      <div className="px-4 py-3">
        <button type="button" onClick={install} className="flex w-full items-center gap-3 text-left">
          <span className="flex size-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <Smartphone className="size-4" />
          </span>
          <span className="flex-1 text-sm font-semibold">{t("App install karo")}</span>
          <Download className="size-4 text-muted" />
        </button>
        {iosSteps && steps}
      </div>
    );
  }

  return (
    <section className={cx("relative overflow-hidden rounded-3xl border border-primary/20 bg-primary-soft p-4")} aria-label={t("Install the app")}>
      <button type="button" onClick={dismiss} aria-label={t("Not now")} className="absolute right-2 top-2 rounded-full p-1.5 text-muted hover:bg-surface">
        <X className="size-4" />
      </button>
      <div className="flex items-center gap-3 pr-6">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-white">
          <Smartphone className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold">{t("PERSONA 90 app install karo")}</p>
          <p className="text-xs text-muted">{t("Home screen se seedha khule, full screen, reminders ke saath · 1 MB se kam")}</p>
        </div>
        {!iosSteps && (
          <Button onClick={install} className="h-9 shrink-0 px-3 text-xs">
            <Download className="size-4" />{" "}{t("Install")}</Button>
        )}
      </div>
      {iosSteps && steps}
    </section>
  );
}
