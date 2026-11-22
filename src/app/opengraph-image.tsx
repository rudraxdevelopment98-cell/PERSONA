import { ImageResponse } from "next/og";
import { OG_SIZE, OgFrame } from "@/lib/og";

export const alt = "PERSONA 90: a 90-day programme for confidence, communication and decisions";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <OgFrame eyebrow="90 DIN · 30 MINUTE ROZ" title="Confidence, baat-cheet aur faisle. Roz thoda behtar." sub="Interactive kahaniyan, practice aur AI coach. Free shuru karo." />,
    size,
  );
}
