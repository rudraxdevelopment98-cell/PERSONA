/**
 * Free "HD voice": Piper neural text-to-speech (rhasspy/piper, MIT) running
 * entirely on the listener's device. The voice model (~64 MB) downloads once
 * from the official Piper voices repository and is kept in Cache Storage; after
 * that it works offline and costs nothing per story.
 */

export type PiperVoiceId = "hi-priyamvada" | "hi-rohan" | "hi-pratham" | "en-alba" | "en-lessac";

export const PIPER_VOICES: { id: PiperVoiceId; path: string; label: string; lang: "hi" | "en"; sample: string }[] = [
  { id: "hi-priyamvada", path: "hi/hi_IN/priyamvada/medium/hi_IN-priyamvada-medium", label: "Priyamvada · Hindi/Hinglish (female)", lang: "hi", sample: "/voice-samples/hi-priyamvada.mp3" },
  { id: "hi-rohan", path: "hi/hi_IN/rohan/medium/hi_IN-rohan-medium", label: "Rohan · Hindi/Hinglish (male)", lang: "hi", sample: "/voice-samples/hi-rohan.mp3" },
  { id: "hi-pratham", path: "hi/hi_IN/pratham/medium/hi_IN-pratham-medium", label: "Pratham · Hindi/Hinglish (male)", lang: "hi", sample: "/voice-samples/hi-pratham.mp3" },
  { id: "en-alba", path: "en/en_GB/alba/medium/en_GB-alba-medium", label: "Alba · English (female)", lang: "en", sample: "/voice-samples/en-alba.mp3" },
  { id: "en-lessac", path: "en/en_US/lessac/medium/en_US-lessac-medium", label: "Lessac · English (female)", lang: "en", sample: "/voice-samples/en-lessac.mp3" },
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

/** Text → phoneme ids with espeak-ng (WebAssembly). */
async function phonemize(text: string, espeakVoice: string): Promise<number[]> {
  const { createPiperPhonemize } = await import("./vendor/piper-phonemize.js");
  return new Promise((resolve, reject) => {
    let done = false;
    createPiperPhonemize({
      print: (data: string) => {
        if (done) return;
        done = true;
        try {
          resolve(JSON.parse(data).phoneme_ids);
        } catch (e) {
          reject(e);
        }
      },
      printErr: (m: string) => {
        if (!done && /error/i.test(m)) {
          done = true;
          reject(new Error(m));
        }
      },
      locateFile: (url: string) => (url.endsWith(".wasm") ? `${PHONEMIZE_BASE}.wasm` : url.endsWith(".data") ? `${PHONEMIZE_BASE}.data` : url),
    }).then((module: { callMain: (args: string[]) => void }) => {
      module.callMain(["-l", espeakVoice, "--input", JSON.stringify([{ text }]), "--espeak_data", "/espeak-ng-data"]);
    }, reject);
  });
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

/** Speaks one paragraph into a WAV blob URL. */
export async function synthesize(id: PiperVoiceId, text: string): Promise<string> {
  const { session, config } = await loadVoice(id);
  const ort = await loadOrt();
  const ids = await phonemize(text.trim(), config.espeak.voice);
  if (!ids?.length) throw new Error("Nothing to say");
  const feeds: Record<string, unknown> = {
    input: new ort.Tensor("int64", BigInt64Array.from(ids.map((n) => BigInt(n))), [1, ids.length]),
    input_lengths: new ort.Tensor("int64", BigInt64Array.from([BigInt(ids.length)]), [1]),
    scales: new ort.Tensor("float32", Float32Array.from([config.inference.noise_scale, config.inference.length_scale, config.inference.noise_w]), [3]),
  };
  if (config.speaker_id_map && Object.keys(config.speaker_id_map).length) feeds.sid = new ort.Tensor("int64", BigInt64Array.from([0n]), [1]);
  const { output } = await session.run(feeds);
  return URL.createObjectURL(wav(output.data, config.audio.sample_rate));
}
