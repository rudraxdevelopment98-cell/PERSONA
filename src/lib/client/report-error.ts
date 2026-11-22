"use client";

let sent = 0;

/** Sends a short error report (message + page path, nothing typed by the person). At most 3 per page load. */
export function reportError(message: string) {
  if (sent >= 3 || typeof window === "undefined") return;
  sent++;
  const body = JSON.stringify({ message: String(message).slice(0, 400), path: location.pathname });
  try {
    if (navigator.sendBeacon) navigator.sendBeacon("/api/errors", new Blob([body], { type: "application/json" }));
    else fetch("/api/errors", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => {});
  } catch {
    /* never let reporting break the page */
  }
}
