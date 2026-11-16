/**
 * Picking the best free voice the device already has. Phones and browsers ship
 * very different voices: Android's Google network voices, Apple's Enhanced and
 * Premium voices and Edge's "Natural" voices sound human, while compact or
 * eSpeak voices sound robotic. We rank them and let the person choose.
 */

export type VoiceLang = "hi" | "en";

/** Devanagari text needs a Hindi voice; English and Roman Hinglish read best with Indian English. */
export const langOf = (text: string): VoiceLang => (/[ऀ-ॿ]/.test(text) ? "hi" : "en");

const NOVELTY = /albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|hysterical|jester|organ|pipe organ|superstar|trinoids|whisper|wobble|zarvox|grandma|grandpa|rocko|shelley|flo\b|eddy|reed|sandy/i;

export function voiceScore(v: SpeechSynthesisVoice, lang: VoiceLang): number {
  const code = v.lang.replace("_", "-").toLowerCase();
  const name = v.name;
  let s = 0;
  if (lang === "hi") {
    if (!code.startsWith("hi")) return -1000;
    s += 40;
  } else {
    if (!code.startsWith("en")) return -1000;
    s += code === "en-in" ? 40 : code === "en-gb" ? 22 : code === "en-us" ? 20 : 12;
  }
  if (/natural|neural/i.test(name)) s += 60;
  if (/premium/i.test(name)) s += 55;
  if (/enhanced/i.test(name)) s += 45;
  if (/online/i.test(name)) s += 35;
  if (/google/i.test(name)) s += 30;
  if (/siri/i.test(name)) s += 25;
  if (v.localService === false) s += 10;
  if (/compact|espeak|eloquence|mbrola/i.test(name)) s -= 40;
  if (NOVELTY.test(name)) s -= 500;
  return s;
}

/** Good-sounding voices start around this score. */
export const GOOD_VOICE = 70;

export function rankedVoices(lang: VoiceLang): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  return window.speechSynthesis
    .getVoices()
    .map((v) => ({ v, s: voiceScore(v, lang) }))
    .filter((x) => x.s > -100)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.v);
}

const KEY = (lang: VoiceLang) => `p90-voice-${lang}`;

export function savedVoiceName(lang: VoiceLang): string | null {
  try {
    return localStorage.getItem(KEY(lang));
  } catch {
    return null;
  }
}

export function saveVoiceName(lang: VoiceLang, name: string) {
  try {
    localStorage.setItem(KEY(lang), name);
  } catch {}
}

/** The person's chosen voice for this language, else the best-ranked one. */
export function bestVoice(lang: VoiceLang): { lang: string; voice: SpeechSynthesisVoice | null } {
  const ranked = rankedVoices(lang);
  const saved = savedVoiceName(lang);
  const voice = (saved && ranked.find((v) => v.name === saved)) || ranked[0] || null;
  return { lang: voice?.lang ?? (lang === "hi" ? "hi-IN" : "en-IN"), voice };
}

/**
 * Splits a paragraph into sentence-sized pieces. Short utterances sound more
 * natural (the voice resets its intonation per sentence) and avoid Android's
 * habit of cutting off long ones.
 */
export function sentences(text: string, max = 220): string[] {
  const parts = text.match(/[^.!?।]+[.!?।]+["'”’)]*\s*|[^.!?।]+$/g) ?? [text];
  const out: string[] = [];
  for (const raw of parts) {
    const p = raw.trim();
    if (!p) continue;
    if (p.length <= max) {
      out.push(p);
      continue;
    }
    // Very long sentence: break at commas, then at spaces.
    let buf = "";
    for (const w of p.split(/(?<=[,;:—])\s+|\s+/)) {
      if ((buf + " " + w).trim().length > max && buf) {
        out.push(buf.trim());
        buf = w;
      } else buf = `${buf} ${w}`;
    }
    if (buf.trim()) out.push(buf.trim());
  }
  return out;
}

/** Where to get a better free voice, by platform. */
export function voiceTip(lang: VoiceLang): string {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  const which = lang === "hi" ? "Hindi" : "English (India)";
  if (/iPhone|iPad|iPod/i.test(ua))
    return `iPhone: Settings → Accessibility → Spoken Content → Voices → ${which} → "${lang === "hi" ? "Lekha" : "Rishi"} (Enhanced)" download karo (free). Phir yahan wo awaaz chuno.`;
  if (/Android/i.test(ua))
    return `Android: Settings → "Text-to-speech" → Google engine → Install voice data → ${which} download karo (free). Chrome mein "Google" wali awaaz sabse natural hai.`;
  if (/Edg\//.test(ua)) return `Edge mein "Microsoft … Online (Natural)" awaaz chuno: ye free aur sabse natural hain.`;
  return `Sabse natural free awaaz ke liye Microsoft Edge browser mein kholo ("Online (Natural)" voices), ya phone par Google/Enhanced voice download karo.`;
}
