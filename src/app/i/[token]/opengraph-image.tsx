import { ImageResponse } from "next/og";
import { OG_SIZE, OgFrame } from "@/lib/og";
import { inviteInfo } from "@/lib/server/social";

export const alt = "An invite to PERSONA 90";
export const size = OG_SIZE;
export const contentType = "image/png";

/** Invite link preview: who invited you (first name only), nothing else about them. */
export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const info = /^[A-Za-z0-9_-]{10,64}$/.test(token) ? await inviteInfo(token).catch(() => null) : null;
  const first = info?.valid ? (info.inviterName ?? "").split(" ")[0].slice(0, 20) : "";
  const title = !first ? "Tumhe PERSONA 90 par invite kiya gaya hai" : info?.kind === "circle" ? `${first} ne tumhe ${info.circleName ?? "circle"} mein bulaya hai` : `${first} ne tumhe saath grow karne ke liye invite kiya hai`;
  return new ImageResponse(<OgFrame eyebrow="INVITE" title={title} sub="Pehla episode poora karo aur dono ko 7 din Pro free milega." />, size);
}
