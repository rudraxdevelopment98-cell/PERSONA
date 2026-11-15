"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Trash2 } from "lucide-react";
import { Alert, Button, Card, CardHeader, Input, Label, Select } from "@/components/ui";
import { createCouponAction, deleteCouponAction, grantProAction, savePaymentsAction } from "../actions";

function useRun() {
  const router = useRouter();
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ error?: string }>, ok: string, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.error) setMsg({ tone: "danger", text: r.error });
      else {
        setMsg({ tone: "success", text: ok });
        after?.();
        router.refresh();
      }
    });
  return { msg, pending, run };
}

export function PaymentSettings({
  config,
  webhookUrl,
}: {
  config: { env: string; clientToken: string; priceMonth: string; priceYear: string; apiKeyHint: string | null; webhookHint: string | null };
  webhookUrl: string;
}) {
  const [f, setF] = useState({ env: config.env, clientToken: config.clientToken, priceMonth: config.priceMonth, priceYear: config.priceYear, apiKey: "", webhookSecret: "" });
  const { msg, pending, run } = useRun();
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const live = Boolean(config.clientToken && config.priceMonth && config.webhookHint);
  return (
    <Card>
      <CardHeader
        title="Paddle connection"
        description={live ? `Connected (${config.env}). Checkout is live on the pricing page.` : "Not connected yet - the pricing page offers the free trial and codes only."}
      />
      <form
        className="grid gap-3 px-5 pb-5 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => savePaymentsAction(f), "Saved.", () => setF((x) => ({ ...x, apiKey: "", webhookSecret: "" })));
        }}
      >
        <div className="sm:col-span-2 rounded-xl bg-bg p-3 text-xs leading-relaxed text-muted">
          <b className="text-ink">Setup:</b> create a free Paddle account → Catalog: add product &quot;PERSONA 90 Pro&quot; with a monthly and a yearly price → Developer tools:
          create a client-side token and an API key → Notifications: add a webhook destination with the URL below and events subscription.created / updated / canceled,
          then paste its secret here. Test in sandbox first.
          <span className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-surface px-2 py-1 text-ink">{webhookUrl}</code>
            <button type="button" className="inline-flex items-center gap-1 font-semibold text-primary" onClick={() => navigator.clipboard.writeText(webhookUrl).catch(() => {})}>
              <Copy className="size-3.5" /> Copy
            </button>
          </span>
        </div>
        <div>
          <Label htmlFor="pd-env">Mode</Label>
          <Select id="pd-env" value={f.env} onChange={set("env")}>
            <option value="sandbox">Sandbox (testing)</option>
            <option value="production">Live</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="pd-token">Client-side token</Label>
          <Input id="pd-token" value={f.clientToken} onChange={set("clientToken")} placeholder="test_… or live_…" />
        </div>
        <div>
          <Label htmlFor="pd-month">Monthly price ID</Label>
          <Input id="pd-month" value={f.priceMonth} onChange={set("priceMonth")} placeholder="pri_…" />
        </div>
        <div>
          <Label htmlFor="pd-year">Yearly price ID</Label>
          <Input id="pd-year" value={f.priceYear} onChange={set("priceYear")} placeholder="pri_…" />
        </div>
        <div>
          <Label htmlFor="pd-api">API key {config.apiKeyHint && <span className="font-normal text-muted">(saved {config.apiKeyHint})</span>}</Label>
          <Input id="pd-api" type="password" value={f.apiKey} onChange={set("apiKey")} placeholder={config.apiKeyHint ? "Leave empty to keep" : "pdl_…"} autoComplete="off" />
        </div>
        <div>
          <Label htmlFor="pd-hook">Webhook secret {config.webhookHint && <span className="font-normal text-muted">(saved {config.webhookHint})</span>}</Label>
          <Input id="pd-hook" type="password" value={f.webhookSecret} onChange={set("webhookSecret")} placeholder={config.webhookHint ? "Leave empty to keep" : "pdl_ntfset_…"} autoComplete="off" />
        </div>
        <div className="sm:col-span-2">
          <Button disabled={pending}>Save</Button>
        </div>
        {msg && <div className="sm:col-span-2"><Alert tone={msg.tone}>{msg.text}</Alert></div>}
      </form>
    </Card>
  );
}

export function GrantPro() {
  const [email, setEmail] = useState("");
  const [days, setDays] = useState(30);
  const { msg, pending, run } = useRun();
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => grantProAction(email, days), `Pro added for ${days} days.`, () => setEmail(""));
      }}
    >
      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="their account email" aria-label="Email" />
      <div className="flex gap-2">
        <Input type="number" min={1} max={3650} value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Days" className="w-28" />
        <Button disabled={pending || !email}>Give Pro</Button>
      </div>
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
    </form>
  );
}

export function CouponManager({ coupons }: { coupons: { code: string; days: number; max_uses: number; uses: number; expires_at: string | null; note: string | null }[] }) {
  const [code, setCode] = useState("");
  const [days, setDays] = useState(30);
  const [uses, setUses] = useState(100);
  const [expires, setExpires] = useState<number | "">(30);
  const { msg, pending, run } = useRun();
  return (
    <div className="space-y-3">
      <form
        className="grid grid-cols-2 gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => createCouponAction({ code, days, maxUses: uses, expiresInDays: expires === "" ? null : expires, note: "" }), `Code ${code.toUpperCase()} created.`, () => setCode(""));
        }}
      >
        <Input className="col-span-2" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="CODE e.g. LAUNCH30" aria-label="Code" maxLength={32} />
        <label className="text-xs text-muted">Pro days<Input type="number" min={1} value={days} onChange={(e) => setDays(Number(e.target.value))} /></label>
        <label className="text-xs text-muted">Max uses<Input type="number" min={1} value={uses} onChange={(e) => setUses(Number(e.target.value))} /></label>
        <label className="text-xs text-muted">Expires in days (empty = never)<Input type="number" min={1} value={expires} onChange={(e) => setExpires(e.target.value === "" ? "" : Number(e.target.value))} /></label>
        <div className="flex items-end"><Button disabled={pending || code.length < 4} className="w-full">Create code</Button></div>
      </form>
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      <div className="divide-y divide-line text-sm">
        {coupons.length === 0 && <p className="text-muted">No codes yet.</p>}
        {coupons.map((c) => (
          <div key={c.code} className="flex items-center justify-between gap-2 py-2">
            <span>
              <code className="font-bold">{c.code}</code>
              <span className="block text-xs text-muted">
                {c.days} days · used {c.uses}/{c.max_uses}
                {c.expires_at ? ` · expires ${new Date(c.expires_at).toLocaleDateString()}` : ""}
              </span>
            </span>
            <button type="button" aria-label={`Delete ${c.code}`} disabled={pending} onClick={() => run(() => deleteCouponAction(c.code), "Code deleted.")} className="rounded-lg p-1.5 text-muted hover:bg-bg hover:text-danger">
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
