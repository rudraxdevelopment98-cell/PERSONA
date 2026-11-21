"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Trash2 } from "lucide-react";
import { Alert, Button, Card, CardHeader, Input, Label, Select } from "@/components/ui";
import { createCouponAction, deleteCouponAction, grantProAction, saveAndroidAction, saveLegalAction, savePaymentsAction } from "../actions";

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

/** Play Store app: the package, the upload key and Google's app-signing key for /.well-known/assetlinks.json. */
export function AndroidApp({ pkg, uploadKey, fingerprints }: { pkg: string; uploadKey: string; fingerprints: string[] }) {
  const router = useRouter();
  const [value, setValue] = useState(fingerprints.join("\n"));
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <Card>
      <CardHeader title="Android app (Play Store)" description="The app opens this website full screen once these keys match Play Console." />
      <div className="space-y-3 px-5 pb-5 text-sm">
        <p>
          Package: <code className="rounded bg-bg px-1.5 py-0.5">{pkg}</code>
        </p>
        <p className="break-all text-xs text-muted">Upload key (always included): {uploadKey}</p>
        <div className="space-y-1.5">
          <Label htmlFor="android-fp">App signing key SHA-256 (Play Console → Test and release → App integrity)</Label>
          <textarea
            id="android-fp"
            rows={3}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="AB:CD:…"
            className="w-full rounded-2xl border border-line bg-bg px-4 py-2.5 font-mono text-xs"
          />
        </div>
        <Button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await saveAndroidAction(value);
              setMsg(r.error ? { tone: "danger", text: r.error } : { tone: "success", text: "Saved. /.well-known/assetlinks.json updates within 5 minutes." });
              router.refresh();
            })
          }
        >
          Save keys
        </Button>
        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      </div>
    </Card>
  );
}

/** Who runs the service and how to reach the Grievance Officer: shown on the Terms, Privacy and Refund pages. */
export function LegalContact({ initial }: { initial: { business: string; email: string; grievanceName: string; city: string } }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const field = (key: keyof typeof v, label: string, placeholder: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`legal-${key}`}>{label}</Label>
      <Input id={`legal-${key}`} value={v[key]} placeholder={placeholder} onChange={(e) => setV({ ...v, [key]: e.target.value })} />
    </div>
  );
  return (
    <Card>
      <CardHeader
        title="Legal and contact"
        description="Shown on /terms, /privacy and /refund. Paddle and Google Play need a real support email; India's DPDP Rules need a grievance contact."
      />
      <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
        {field("business", "Business or your name", "PERSONA 90")}
        {field("email", "Support / grievance email", "support@yourdomain.com")}
        {field("grievanceName", "Grievance Officer name", "Your name")}
        {field("city", "City, State", "Ahmedabad, Gujarat")}
        <div className="flex items-center gap-3 sm:col-span-2">
          <Button
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await saveLegalAction(v);
                setMsg(r.error ? { tone: "danger", text: r.error } : { tone: "success", text: "Saved. The legal pages show it now." });
                router.refresh();
              })
            }
          >
            Save
          </Button>
          {!initial.email && <span className="text-xs text-muted">Until an email is set, pages point people to Settings → Help and contact.</span>}
        </div>
        {msg && <div className="sm:col-span-2"><Alert tone={msg.tone}>{msg.text}</Alert></div>}
      </div>
    </Card>
  );
}
