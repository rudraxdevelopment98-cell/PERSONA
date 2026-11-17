/**
 * How each emotion is performed by a voice that has no emotion controls of its
 * own (Piper on the device, or the phone's speech engine). Values are
 * multipliers on the voice's defaults.
 *  - pitch: >1 higher, <1 lower (Piper: done by resampling; phone: utterance.pitch)
 *  - pace:  >1 slower (Piper length_scale), <1 faster
 *  - life:  variation in intonation (Piper noise_scale)
 *  - rhythm: variation in syllable timing (Piper noise_w)
 *  - volume: loudness
 *  - pause: seconds of silence after the sentence
 */
export const EMOTIONS = ["neutral", "calm", "happy", "excited", "sad", "angry", "fear", "tense", "whisper", "surprised", "tender", "determined"] as const;
export type Emotion = (typeof EMOTIONS)[number];
export const SPEAKERS = ["narrator", "male", "female", "child"] as const;
export type Speaker = (typeof SPEAKERS)[number];

export type ScriptSentence = { text: string; emotion: Emotion; intensity: number; speaker: Speaker };

type Style = { pitch: number; pace: number; life: number; rhythm: number; volume: number; pause: number };

const STYLE: Record<Emotion, Style> = {
  neutral: { pitch: 1, pace: 1.03, life: 1, rhythm: 1, volume: 1, pause: 0.32 },
  calm: { pitch: 0.98, pace: 1.1, life: 0.85, rhythm: 0.9, volume: 0.92, pause: 0.42 },
  happy: { pitch: 1.07, pace: 0.95, life: 1.25, rhythm: 1.15, volume: 1.05, pause: 0.3 },
  excited: { pitch: 1.1, pace: 0.88, life: 1.35, rhythm: 1.25, volume: 1.12, pause: 0.25 },
  sad: { pitch: 0.93, pace: 1.18, life: 0.8, rhythm: 0.85, volume: 0.82, pause: 0.6 },
  angry: { pitch: 1.03, pace: 0.9, life: 1.35, rhythm: 1.3, volume: 1.2, pause: 0.35 },
  fear: { pitch: 1.07, pace: 0.9, life: 1.3, rhythm: 1.4, volume: 0.92, pause: 0.38 },
  tense: { pitch: 1.02, pace: 0.96, life: 1.15, rhythm: 1.2, volume: 0.95, pause: 0.5 },
  whisper: { pitch: 0.97, pace: 1.15, life: 0.75, rhythm: 0.9, volume: 0.58, pause: 0.55 },
  surprised: { pitch: 1.13, pace: 0.94, life: 1.3, rhythm: 1.2, volume: 1.08, pause: 0.4 },
  tender: { pitch: 0.98, pace: 1.1, life: 0.9, rhythm: 0.95, volume: 0.86, pause: 0.45 },
  determined: { pitch: 1.0, pace: 0.97, life: 1.1, rhythm: 1.05, volume: 1.12, pause: 0.38 },
};

/** Pitch for a character relative to the narrator's voice (a female narrator voicing a man goes lower). */
function speakerPitch(speaker: Speaker, voiceGender: "female" | "male"): number {
  if (speaker === "child") return 1.2;
  if (speaker === "male" && voiceGender === "female") return 0.84;
  if (speaker === "female" && voiceGender === "male") return 1.16;
  return 1;
}

/** The final settings for one sentence: emotion scaled by intensity (1-3), plus the speaker's pitch. */
export function perform(s: Pick<ScriptSentence, "emotion" | "intensity" | "speaker">, voiceGender: "female" | "male") {
  const base = STYLE[s.emotion] ?? STYLE.neutral;
  const k = [0.6, 1, 1.4][Math.max(1, Math.min(3, Math.round(s.intensity || 2))) - 1];
  const scale = (v: number) => 1 + (v - 1) * k;
  return {
    pitch: scale(base.pitch) * speakerPitch(s.speaker, voiceGender),
    pace: scale(base.pace),
    life: scale(base.life),
    rhythm: scale(base.rhythm),
    volume: Math.max(0.4, Math.min(1.3, scale(base.volume))),
    pause: base.pause,
  };
}

export const normaliseSentence = (s: { text: string; emotion?: string; intensity?: number; speaker?: string }): ScriptSentence => ({
  text: s.text.trim(),
  emotion: (EMOTIONS as readonly string[]).includes(s.emotion ?? "") ? (s.emotion as Emotion) : "neutral",
  intensity: Math.max(1, Math.min(3, Math.round(Number(s.intensity) || 2))),
  speaker: (SPEAKERS as readonly string[]).includes(s.speaker ?? "") ? (s.speaker as Speaker) : "narrator",
});
