/** Filler words and phrases counted in spoken practice (English + common Hindi/Hinglish). */
export const FILLERS = ["um", "umm", "uh", "uhh", "er", "erm", "ah", "like", "basically", "actually", "literally", "you know", "i mean", "sort of", "kind of", "matlab", "toh", "na", "yaar", "acha", "haan"];

export type SpeechMetrics = {
  duration_ms: number;
  word_count: number;
  wpm: number;
  filler_count: number;
  fillers: Record<string, number>;
  longest_pause_ms: number;
};

export function analyseSpeech(transcript: string, durationMs: number, longestPauseMs: number): SpeechMetrics {
  const tokens = transcript
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  const fillers: Record<string, number> = {};
  let fillerCount = 0;
  for (const f of FILLERS) {
    const parts = f.split(" ");
    let matches = 0;
    for (let i = 0; i + parts.length <= tokens.length; i++) {
      if (parts.every((p, j) => tokens[i + j] === p)) matches++;
    }
    // "like", "actually" and short Hindi words are often meaningful; count them only when repeated.
    const ambiguous = ["like", "na", "toh", "haan", "acha", "actually"].includes(f);
    const counted = ambiguous ? Math.max(0, matches - 1) : matches;
    if (counted > 0) {
      fillers[f] = counted;
      fillerCount += counted;
    }
  }
  const minutes = durationMs / 60_000;
  return {
    duration_ms: Math.round(durationMs),
    word_count: tokens.length,
    wpm: minutes > 0 ? Math.round((tokens.length / minutes) * 10) / 10 : 0,
    filler_count: fillerCount,
    fillers,
    longest_pause_ms: Math.round(longestPauseMs),
  };
}
