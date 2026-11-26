/** Visual styles for the skills dial. The person picks one in Settings. */

export type Surface = "plain" | "flatGreen" | "glossy" | "glass" | "neumorph" | "neon" | "metal" | "soft";

export type DialTheme = {
  id: string;
  name: string;
  arc: number; // gauge span: 1 = full ring, 0.72 = 270° gauge
  ticks: "none" | "major" | "segments" | "dots";
  from: string; // fill gradient start
  to: string; // fill gradient end
  track: string; // gauge track colour
  glow: boolean; // neon glow on the fill
  valueSurface: Surface;
  knobSurface: Surface;
};

/** Dark surfaces show light text/icon. */
export const isDarkSurface = (s: Surface) => s === "glossy" || s === "neon" || s === "metal" || s === "flatGreen";

export const DIAL_THEMES: DialTheme[] = [
  { id: "classic", name: "Classic Car", arc: 0.72, ticks: "major", from: "#34d399", to: "#0e9f8a", track: "#e2e8f0", glow: false, valueSurface: "plain", knobSurface: "flatGreen" },
  { id: "speedometer", name: "Dual Speedometer", arc: 0.72, ticks: "major", from: "#8be0c6", to: "#0e9f8a", track: "#e9eef3", glow: false, valueSurface: "plain", knobSurface: "metal" },
  { id: "twin", name: "Twin Circular", arc: 1, ticks: "none", from: "#2dd4bf", to: "#0e7f6f", track: "#dce7e4", glow: false, valueSurface: "plain", knobSurface: "flatGreen" },
  { id: "automotive", name: "Modern Automotive", arc: 1, ticks: "none", from: "#60a5fa", to: "#3b82f6", track: "#1f2937", glow: true, valueSurface: "glossy", knobSurface: "glossy" },
  { id: "minimal", name: "Minimalist", arc: 0.72, ticks: "dots", from: "#9ae6c7", to: "#2dd4bf", track: "#eef2f5", glow: false, valueSurface: "plain", knobSurface: "soft" },
  { id: "hud", name: "Futuristic HUD", arc: 1, ticks: "none", from: "#22d3ee", to: "#818cf8", track: "#1b2540", glow: true, valueSurface: "neon", knobSurface: "neon" },
  { id: "soft", name: "Soft Material", arc: 1, ticks: "none", from: "#5eead4", to: "#38bdf8", track: "#e6ebf0", glow: false, valueSurface: "neumorph", knobSurface: "neumorph" },
  { id: "dualknob", name: "Dual Knob Rings", arc: 1, ticks: "none", from: "#34d399", to: "#0e9f8a", track: "#d7dde4", glow: false, valueSurface: "metal", knobSurface: "metal" },
  { id: "sporty", name: "Sporty Meter", arc: 0.72, ticks: "segments", from: "#34d399", to: "#0e7f6f", track: "#e2e8f0", glow: false, valueSurface: "plain", knobSurface: "glossy" },
  { id: "glass", name: "Elegant Glass", arc: 1, ticks: "none", from: "#5eead4", to: "#0e9f8a", track: "rgba(148,163,184,.35)", glow: false, valueSurface: "glass", knobSurface: "glass" },
];

export const DEFAULT_DIAL = "classic";
export const dialTheme = (id: string | null | undefined) => DIAL_THEMES.find((d) => d.id === id) ?? DIAL_THEMES[0];
export const DIAL_STORAGE_KEY = "p90-dial-theme";
