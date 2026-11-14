"use client";

import { useState } from "react";
import { Copy, Download } from "lucide-react";
import { Button } from "./ui";

/** Shows freshly generated recovery codes once, with copy and download. */
export function RecoveryCodes({ codes, email }: { codes: string[]; email?: string }) {
  const [copied, setCopied] = useState(false);
  const text = `PERSONA 90 recovery codes${email ? ` for ${email}` : ""}\nEach code works once to reset a forgotten password.\n\n${codes.join("\n")}\n`;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-bg p-4 font-mono text-sm sm:grid-cols-4">
        {codes.map((c) => (
          <span key={c} className="rounded-lg bg-surface px-2 py-1.5 text-center tracking-wider">
            {c}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(text).catch(() => {});
            setCopied(true);
          }}
        >
          <Copy className="size-4" /> {copied ? "Copied" : "Copy all"}
        </Button>
        <Button
          variant="secondary"
          type="button"
          onClick={() => {
            const a = document.createElement("a");
            a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
            a.download = "persona90-recovery-codes.txt";
            a.click();
            URL.revokeObjectURL(a.href);
          }}
        >
          <Download className="size-4" /> Download
        </Button>
      </div>
    </div>
  );
}
