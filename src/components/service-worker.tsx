"use client";

import { useEffect } from "react";
import { detectStore } from "@/lib/client/app-context";

/**
 * Registers the service worker that makes the app installable, keeps the
 * browser's install prompt for the "Install app" button, and remembers when
 * the app was opened from the Play Store build.
 */
export function ServiceWorker() {
  useEffect(() => {
    detectStore();
    const onPrompt = (e: Event) => {
      e.preventDefault();
      (window as unknown as { __p90Install?: Event }).__p90Install = e;
      window.dispatchEvent(new Event("p90-install-ready"));
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);
  return null;
}
