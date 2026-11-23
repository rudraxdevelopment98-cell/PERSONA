"use client";

import { Download, Share2 } from "lucide-react";
import { useState } from "react";
import { createInviteAction } from "@/app/(app)/friends/actions";
import { Button, Spinner, cx } from "./ui";
import { useT } from "@/lib/i18n/client";

/**
 * Shares a progress image plus a private invite link. Uses the phone's share
 * sheet (WhatsApp, Instagram, …) when it can take files; otherwise downloads the
 * image and opens WhatsApp with the link.
 */
export function ShareProgress({ className, variant = "secondary", label = "Share progress" }: { className?: string; variant?: "primary" | "secondary"; label?: string }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const share = async () => {
    setBusy(true);
    setDone(null);
    try {
      const [img, invite] = await Promise.all([
        fetch("/api/share-card").then((r) => (r.ok ? r.blob() : Promise.reject(new Error("card")))),
        createInviteAction({ kind: "friend" }).catch(() => null),
      ]);
      const url = invite && "url" in invite && invite.url ? invite.url : `${location.origin}/`;
      const text = `I'm growing every day with PERSONA 90. Join me: ${url}`;
      const file = new File([img], "persona90-progress.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text, title: "PERSONA 90" }).catch(() => {});
        return;
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(img);
      a.download = "persona90-progress.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      await navigator.clipboard?.writeText(text).catch(() => {});
      setDone("Image saved · invite link copied");
    } catch {
      setDone("Couldn't create the image. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cx("flex flex-col items-center gap-1.5", className)}>
      <Button type="button" variant={variant} onClick={share} disabled={busy} className="w-full">
        {busy ? <Spinner /> : done ? <Download className="size-4" /> : <Share2 className="size-4" />} {t(label)}
      </Button>
      {done && (
        <p role="status" className="text-xs text-muted">
          {t(done)}
        </p>
      )}
    </div>
  );
}
