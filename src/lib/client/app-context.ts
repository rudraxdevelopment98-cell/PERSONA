/**
 * Where the app is running: a browser tab, an installed web app (PWA), or the
 * Play Store app (a Trusted Web Activity that opens /dashboard?src=twa).
 *
 * Inside the Play Store app, digital purchases must go through Google Play
 * Billing, so web checkout is hidden there. The "store" choice is remembered in
 * a cookie so server-rendered pages can adapt too.
 */

export const STORE_COOKIE = "p90_store";

export type Platform = "android" | "ios" | "desktop";

export function platform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function readStore(): "play" | null {
  if (typeof document === "undefined") return null;
  return /(?:^|;\s*)p90_store=play/.test(document.cookie) ? "play" : null;
}

/** Call once on load: remembers that this is the Play Store app. */
export function detectStore() {
  if (typeof window === "undefined") return;
  const fromTwa = new URLSearchParams(location.search).get("src") === "twa" || document.referrer.startsWith("android-app://");
  if (fromTwa && !readStore()) document.cookie = `${STORE_COOKIE}=play; path=/; max-age=31536000; samesite=lax; secure`;
}
