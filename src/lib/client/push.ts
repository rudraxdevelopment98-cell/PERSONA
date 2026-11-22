"use client";

import { pushKeyAction, savePushAction } from "@/app/(app)/friends/actions";

function urlB64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export type PushState = "unsupported" | "denied" | "off" | "on";

export async function pushState(): Promise<PushState> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub ? "on" : "off";
}

/** Asks for permission and saves this device's push subscription. Returns the new state or an error message. */
export async function enablePush(): Promise<{ state: PushState; error?: string }> {
  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return { state: perm === "denied" ? "denied" : "off" };
    const keyRes = await pushKeyAction();
    if (keyRes.error !== undefined) return { state: "off", error: keyRes.error };
    const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
    await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(keyRes.key!) });
    const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
    const res = await savePushAction({ endpoint: json.endpoint, keys: json.keys });
    if (res.error) return { state: "off", error: res.error };
    return { state: "on" };
  } catch {
    return { state: "off", error: "Couldn't turn on notifications in this browser. On iPhone, add the app to your Home Screen first." };
  }
}
