"use client";

import { useEffect } from "react";
import { detectStore } from "@/lib/client/app-context";
import { reportError } from "@/lib/client/report-error";

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
    // Uncaught errors and failed promises in the browser go to Admin -> Errors (message + page only).
    const onError = (e: ErrorEvent) => {
      if (e.message && !/ResizeObserver loop/.test(e.message)) reportError(e.message);
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason as { message?: string } | string | undefined;
      const msg = typeof r === "string" ? r : r?.message;
      if (msg && !/AbortError|The user aborted|Load failed|NetworkError/.test(msg)) reportError(`Unhandled: ${msg}`);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
