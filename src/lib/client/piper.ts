import { perform, type ScriptSentence } from "@/lib/domain/emotion";

/**
 * Free "HD voice": Piper neural text-to-speech (rhasspy/piper, MIT) running
 * entirely on the listener's device. The voice model (~64 MB) downloads once
 * from the official Piper voices repository and is kept in Cache Storage; after
 * that it works offline and costs nothing per story.
 */

export type PiperVoiceId = "hi-priyamvada" | "hi-rohan" | "hi-pratham" | "en-alba" | "en-lessac";

export const PIPER_VOICES: { id: PiperVoiceId; path: string; label: string; lang: "hi" | "en"; gender: "female" | "male"; sample: string }[] = [
  { id: "hi-priyamvada", path: "hi/hi_IN/priyamvada/medium/hi_IN-priyamvada-medium", label: "Priyamvada · Hindi/Hinglish (female)", lang: "hi", gender: "female", sample: "/voice-samples/hi-priyamvada.mp3" },
  { id: "hi-rohan", path: "hi/hi_IN/rohan/medium/hi_IN-rohan-medium", label: "Rohan · Hindi/Hinglish (male)", lang: "hi", gender: "male", sample: "/voice-samples/hi-rohan.mp3" },
  { id: "hi-pratham", path: "hi/hi_IN/pratham/medium/hi_IN-pratham-medium", label: "Pratham · Hindi/Hinglish (male)", lang: "hi", gender: "male", sample: "/voice-samples/hi-pratham.mp3" },
  { id: "en-alba", path: "en/en_GB/alba/medium/en_GB-alba-medium", label: "Alba · English (female)", lang: "en", gender: "female", sample: "/voice-samples/en-alba.mp3" },
  { id: "en-lessac", path: "en/en_US/lessac/medium/en_US-lessac-medium", label: "Lessac · English (female)", lang: "en", gender: "female", sample: "/voice-samples/en-lessac.mp3" },
];

const MODEL_BASE = "https://huggingface.co/rhasspy/piper-voices/resolve/main";
const ORT_VERSION = "1.31.1";
const ORT_BASE = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;
const PHONEMIZE_BASE = "https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize";
const CACHE = "p90-piper-v1";

export const piperVoice = (id: string) => PIPER_VOICES.find((v) => v.id === id) ?? null;
export const piperSupported = () => typeof window !== "undefined" && typeof WebAssembly === "object" && "caches" in window;

type Progress = (loaded: number, total: number) => void;
type Ort = {
  env: { wasm: { wasmPaths: string; numThreads: number } };
  InferenceSession: { create: (m: ArrayBuffer, o: unknown) => Promise<OrtSession> };
  Tensor: new (type: string, data: unknown, dims?: number[]) => unknown;
};
type OrtSession = { run: (feeds: Record<string, unknown>) => Promise<{ output: { data: Float32Array } }> };
type ModelConfig = {
  audio: { sample_rate: number };
  espeak: { voice: string };
  inference: { noise_scale: number; length_scale: number; noise_w: number };
  speaker_id_map?: Record<string, number>;
};

let ortPromise: Promise<Ort> | null = null;
function loadOrt(): Promise<Ort> {
  const w = window as unknown as { ort?: Ort };
  if (w.ort) return Promise.resolve(w.ort);
  ortPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `${ORT_BASE}ort.wasm.min.js`;
    s.async = true;
    s.onload = () => {
      const ort = (window as unknown as { ort?: Ort }).ort;
      if (!ort) return reject(new Error("onnxruntime did not load"));
      ort.env.wasm.wasmPaths = ORT_BASE;
      ort.env.wasm.numThreads = 1; // no cross-origin isolation, so a single thread
      resolve(ort);
    };
    s.onerror = () => {
      ortPromise = null;
      reject(new Error("Could not load the voice engine. Check your connection."));
    };
    document.head.appendChild(s);
  });
  return ortPromise;
}

async function cached(url: string): Promise<Response | undefined> {
  try {
    return await (await caches.open(CACHE)).match(url);
  } catch {
    return undefined;
  }
}

/** Downloads a file with progress and keeps it in Cache Storage. */
async function fetchCached(url: string, onProgress?: Progress): Promise<ArrayBuffer> {
  const hit = await cached(url);
  if (hit) return hit.arrayBuffer();
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Download failed (${res.status})`);
  const total = Number(res.headers.get("content-length") ?? 0);
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    onProgress?.(loaded, total);
  }
  const buf = new Uint8Array(loaded);
  let o = 0;
  for (const c of chunks) {
    buf.set(c, o);
    o += c.length;
  }
  try {
    await (await caches.open(CACHE)).put(url, new Response(buf, { headers: { "content-type": "application/octet-stream" } }));
  } catch {
    // Storage full or blocked: it still works for this visit.
  }
  return buf.buffer;
}

export async function isDownloaded(id: PiperVoiceId): Promise<boolean> {
  const v = piperVoice(id);
  if (!v) return false;
  return Boolean(await cached(`${MODEL_BASE}/${v.path}.onnx`));
}

export async function removeVoice(id: PiperVoiceId) {
  const v = piperVoice(id);
  if (!v) return;
  try {
    const c = await caches.open(CACHE);
    await c.delete(`${MODEL_BASE}/${v.path}.onnx`);
    await c.delete(`${MODEL_BASE}/${v.path}.onnx.json`);
  } catch {}
  if (loaded?.id === id) loaded = null;
}

type Loaded = { id: PiperVoiceId; session: OrtSession; config: ModelConfig };
let loaded: Loaded | null = null;
let loading: Promise<Loaded> | null = null;

/** Loads (downloading once if needed) the voice model. */
export async function loadVoice(id: PiperVoiceId, onProgress?: Progress): Promise<Loaded> {
  if (loaded?.id === id) return loaded;
  if (loading) {
    const l = await loading.catch(() => null);
    if (l?.id === id) return l;
  }
  loading = (async () => {
    const v = piperVoice(id);
    if (!v) throw new Error("Unknown voice");
    const [ort, model, config] = await Promise.all([
      loadOrt(),
      fetchCached(`${MODEL_BASE}/${v.path}.onnx`, onProgress),
      fetchCached(`${MODEL_BASE}/${v.path}.onnx.json`).then((b) => JSON.parse(new TextDecoder().decode(b)) as ModelConfig),
    ]);
    const session = await ort.InferenceSession.create(model, { executionProviders: ["wasm"] });
    const l: Loaded = { id, session, config };
    loaded = l;
    return l;
  })();
  try {
    return await loading;
  } finally {
    loading = null;
  }
}

type Phonemizer = { mod: { callMain: (args: string[]) => void }; out: string[] };
let phonemizerPromise: Promise<Phonemizer> | null = null;

/** One espeak-ng (WebAssembly) instance, reused for every sentence. */
function phonemizer(): Promise<Phonemizer> {
  phonemizerPromise ??= (async () => {
    const { createPiperPhonemize } = await import("./vendor/piper-phonemize.js");
    const out: string[] = [];
    const mod = await createPiperPhonemize({
      print: (data: string) => out.push(data),
      printErr: () => {},
      locateFile: (url: string) => (url.endsWith(".wasm") ? `${PHONEMIZE_BASE}.wasm` : url.endsWith(".data") ? `${PHONEMIZE_BASE}.data` : url),
    });
    return { mod, out };
  })().catch((e) => {
    phonemizerPromise = null;
    throw e;
  });
  return phonemizerPromise;
}

/** Text → phoneme ids. callMain runs synchronously, so its output is read right after. */
async function phonemize(text: string, espeakVoice: string): Promise<number[]> {
  const { mod, out } = await phonemizer();
  out.length = 0;
  mod.callMain(["-l", espeakVoice, "--input", JSON.stringify([{ text }]), "--espeak_data", "/espeak-ng-data"]);
  const line = out.pop();
  if (!line) throw new Error("Could not read this sentence");
  return JSON.parse(line).phoneme_ids as number[];
}

type Delivery = { noise: number; length: number; noiseW: number; pauseAfter: number };

/**
 * How to perform a sentence. Dialogue is livelier and a touch faster, questions and
 * exclamations carry more variation, suspense ("…") slows down, narration stays calm.
 */
export function delivery(sentence: string): Delivery {
  const t = sentence.trim();
  const dialogue = /^["“'‘]|["”'’]$/.test(t) || /["“].{3,}["”]/.test(t);
  const suspense = /(…|\.\.\.)\s*["”']?$/.test(t);
  const exclaim = /!["”']?$/.test(t);
  const question = /\?["”']?$/.test(t);
  let d: Delivery = { noise: 1.0, length: 1.04, noiseW: 1.0, pauseAfter: 0.32 };
  if (dialogue) d = { noise: 1.22, length: 0.95, noiseW: 1.2, pauseAfter: 0.36 };
  if (exclaim) d = { ...d, noise: Math.max(d.noise, 1.25), length: Math.min(d.length, 0.93), pauseAfter: 0.4 };
  if (question) d = { ...d, noise: Math.max(d.noise, 1.15), pauseAfter: 0.42 };
  if (suspense) d = { ...d, length: 1.14, pauseAfter: 0.7 };
  return d;
}

/** Sentences, keeping closing quotes with their sentence. */
export function speechSentences(text: string): string[] {
  const parts = text.match(/[^.!?।…]+(?:[.!?।…]+|\.\.\.)["'”’)]*\s*|[^.!?।…]+$/g) ?? [text];
  return parts.map((p) => p.trim()).filter((p) => /[\p{L}\p{N}]/u.test(p));
}

function wav(pcm: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + pcm.length * 2);
  const view = new DataView(buffer);
  const str = (o: number, s: string) => [...s].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  view.setUint32(4, 36 + pcm.length * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  str(36, "data");
  view.setUint32(40, pcm.length * 2, true);
  for (let i = 0; i < pcm.length; i++) view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i])) * 0x7fff, true);
  return new Blob([buffer], { type: "audio/wav" });
}

/** Raises (factor > 1) or lowers pitch by resampling; the clip gets shorter or longer by the same factor. */
function resample(pcm: Float32Array, factor: number): Float32Array {
  if (Math.abs(factor - 1) < 0.01) return pcm;
  const out = new Float32Array(Math.floor(pcm.length / factor));
  for (let i = 0; i < out.length; i++) {
    const x = i * factor;
    const j = Math.floor(x);
    const f = x - j;
    out[i] = (pcm[j] ?? 0) * (1 - f) + (pcm[j + 1] ?? 0) * f;
  }
  return out;
}

/**
 * Performs a paragraph from the listening script: each sentence with its own
 * emotion (intonation variety, pace, loudness, pause) and speaker (a man's line
 * read by a female voice goes lower, a child's higher). Pitch is shifted by
 * rendering slower and resampling, so the pace stays as intended.
 */
export async function synthesizeScript(id: PiperVoiceId, sentences: ScriptSentence[]): Promise<string> {
  const { session, config } = await loadVoice(id);
  const ort = await loadOrt();
  const sr = config.audio.sample_rate;
  const base = config.inference;
  const gender = piperVoice(id)?.gender ?? "female";
  const pcms: Float32Array[] = [];
  for (const sentence of sentences) {
    const ids = await phonemize(sentence.text, config.espeak.voice);
    if (!ids?.length) continue;
    const p = perform(sentence, gender);
    const pitch = Math.max(0.75, Math.min(1.3, p.pitch));
    const feeds: Record<string, unknown> = {
      input: new ort.Tensor("int64", BigInt64Array.from(ids.map((n) => BigInt(n))), [1, ids.length]),
      input_lengths: new ort.Tensor("int64", BigInt64Array.from([BigInt(ids.length)]), [1]),
      scales: new ort.Tensor("float32", Float32Array.from([base.noise_scale * p.life, base.length_scale * p.pace * pitch, base.noise_w * p.rhythm]), [3]),
    };
    if (config.speaker_id_map && Object.keys(config.speaker_id_map).length) feeds.sid = new ort.Tensor("int64", BigInt64Array.from([0n]), [1]);
    const { output } = await session.run(feeds);
    const shifted = resample(output.data, pitch);
    for (let i = 0; i < shifted.length; i++) shifted[i] = Math.max(-1, Math.min(1, shifted[i] * p.volume));
    pcms.push(shifted, new Float32Array(Math.round(sr * p.pause)));
  }
  if (!pcms.length) throw new Error("Nothing to say");
  const all = new Float32Array(pcms.reduce((n, x) => n + x.length, 0));
  let o = 0;
  for (const x of pcms) {
    all.set(x, o);
    o += x.length;
  }
  return URL.createObjectURL(wav(all, sr));
}

/** Performs one paragraph sentence by sentence (with natural pauses) into a WAV blob URL. */
export async function synthesize(id: PiperVoiceId, text: string): Promise<string> {
  const { session, config } = await loadVoice(id);
  const ort = await loadOrt();
  const sr = config.audio.sample_rate;
  const base = config.inference;
  const pcms: Float32Array[] = [];
  for (const sentence of speechSentences(text)) {
    const ids = await phonemize(sentence, config.espeak.voice);
    if (!ids?.length) continue;
    const d = delivery(sentence);
    const feeds: Record<string, unknown> = {
      input: new ort.Tensor("int64", BigInt64Array.from(ids.map((n) => BigInt(n))), [1, ids.length]),
      input_lengths: new ort.Tensor("int64", BigInt64Array.from([BigInt(ids.length)]), [1]),
      scales: new ort.Tensor("float32", Float32Array.from([base.noise_scale * d.noise, base.length_scale * d.length, base.noise_w * d.noiseW]), [3]),
    };
    if (config.speaker_id_map && Object.keys(config.speaker_id_map).length) feeds.sid = new ort.Tensor("int64", BigInt64Array.from([0n]), [1]);
    const { output } = await session.run(feeds);
    pcms.push(output.data, new Float32Array(Math.round(sr * d.pauseAfter)));
  }
  if (!pcms.length) throw new Error("Nothing to say");
  const total = pcms.reduce((n, p) => n + p.length, 0);
  const all = new Float32Array(total);
  let o = 0;
  for (const p of pcms) {
    all.set(p, o);
    o += p.length;
  }
  return URL.createObjectURL(wav(all, sr));
}
