"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { Alert, Button, Card, CardHeader, Input, Label, Select } from "@/components/ui";
import { saveAiTiersAction, saveVoiceAction, testModelAction } from "../actions";

type Choice = { id: string; label: string; perSession: number | null };
const money = (n: number) => (Math.abs(n) >= 100 ? `$${Math.round(n).toLocaleString()}` : `$${n.toFixed(2)}`);

export function TierForm({ choices, current }: { choices: Choice[]; current: { free: string; pro: string; light: string; lightForPro: boolean } }) {
  const router = useRouter();
  const [free, setFree] = useState(current.free);
  const [pro, setPro] = useState(current.pro);
  const [light, setLight] = useState(current.light);
  const [lightForPro, setLightForPro] = useState(current.lightForPro);
  const [msg, setMsg] = useState<{ tone: "success" | "danger" | "warning"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const label = (c: Choice) => `${c.label}${c.perSession != null ? ` · ~$${c.perSession.toFixed(3)}/session` : ""}`;
  const test = (id: string) =>
    start(async () => {
      setMsg(null);
      const r = await testModelAction(id);
      if (!r.ok) setMsg({ tone: "danger", text: `Test failed after ${(r.ms / 1000).toFixed(1)}s: ${r.error}` });
      else setMsg({ tone: "success", text: `Works (${(r.ms / 1000).toFixed(1)}s) via ${r.used}. Sample: “${r.sentence}”` });
    });
  return (
    <Card>
      <CardHeader title="AI model per plan" description="Users who connect their own AI key always use their own. If a chosen model fails, the app default takes over automatically." />
      <div className="grid gap-4 px-5 pb-5 md:grid-cols-2">
        {[
          { id: "tier-free", title: "Free plan · stories & profile", value: free, set: setFree },
          { id: "tier-pro", title: "Pro plan · stories & profile", value: pro, set: setPro },
          { id: "tier-light", title: "Everyday tasks · feedback, check-ins, coach", value: light, set: setLight },
        ].map((t) => (
          <div key={t.id} className="space-y-2">
            <Label htmlFor={t.id}>{t.title}</Label>
            <Select id={t.id} value={t.value} onChange={(e) => t.set(e.target.value)}>
              {choices.map((c) => (
                <option key={c.id} value={c.id}>{label(c)}</option>
              ))}
            </Select>
            <Button type="button" variant="ghost" className="h-8 px-2" disabled={pending} onClick={() => test(t.value)}>
              <FlaskConical className="size-4" /> Test this model
            </Button>
          </div>
        ))}
        <label className="flex items-start gap-2 self-end pb-2 text-sm">
          <input type="checkbox" className="mt-0.5 size-4 accent-[var(--color-primary)]" checked={lightForPro} onChange={(e) => setLightForPro(e.target.checked)} />
          <span>Use the everyday model for Pro users too <span className="block text-xs text-muted">Cheaper; Pro keeps its better model for stories.</span></span>
        </label>
        <div className="md:col-span-2 flex flex-wrap items-center gap-3">
          <Button
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await saveAiTiersAction(free, pro, light, lightForPro);
                setMsg(r.error ? { tone: "danger", text: r.error } : { tone: "success", text: "Saved. New requests use these models within a few seconds." });
                router.refresh();
              })
            }
          >
            Save models
          </Button>
          <span className="text-xs text-muted">Gateway models are billed to your Vercel account; Gemini models to the Gemini key&apos;s Google account.</span>
        </div>
        {msg && <div className="md:col-span-2"><Alert tone={msg.tone}>{msg.text}</Alert></div>}
      </div>
    </Card>
  );
}

/** What-if calculator for monthly profit at a given scale. */
export function Calculator({ defaults }: { defaults: { users: number; perSession: number; price: number } }) {
  const [v, setV] = useState({
    users: defaults.users,
    activeDaily: 25,
    proShare: 4,
    price: defaults.price,
    freeSession: Number(defaults.perSession.toFixed(4)),
    proSession: 0.08,
    labsPerDay: 0.005,
    platform: 45,
  });
  const n = (k: keyof typeof v) => (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: Number(e.target.value) || 0 }));
  const r = useMemo(() => {
    const active = (v.users * v.activeDaily) / 100;
    const pro = (v.users * v.proShare) / 100;
    const proActive = (active * v.proShare) / 100;
    const freeActive = active - proActive;
    const ai = 30 * (freeActive * v.freeSession + proActive * (v.proSession + v.labsPerDay * 4));
    const revenue = pro * v.price;
    const fees = pro * (v.price * 0.05 + 0.5);
    const profit = revenue - fees - ai - v.platform;
    return { active, pro, ai, revenue, fees, profit };
  }, [v]);
  const fields: { k: keyof typeof v; label: string; step?: string }[] = [
    { k: "users", label: "Total users" },
    { k: "activeDaily", label: "Active each day (%)" },
    { k: "proShare", label: "Paying Pro (%)" },
    { k: "price", label: "Pro price / month ($)", step: "0.01" },
    { k: "freeSession", label: "AI cost / free session ($)", step: "0.001" },
    { k: "proSession", label: "AI cost / Pro session ($)", step: "0.001" },
    { k: "platform", label: "Hosting, database, domain / month ($)" },
  ];
  return (
    <Card>
      <CardHeader title="Profit calculator" description="Payment fees are taken as 5% + $0.50 per monthly charge (typical for a Merchant of Record). Adjust to your real numbers." />
      <div className="grid gap-4 px-5 pb-5 lg:grid-cols-[1fr_280px]">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {fields.map((f) => (
            <div key={f.k}>
              <Label htmlFor={`calc-${f.k}`} className="text-xs">{f.label}</Label>
              <Input id={`calc-${f.k}`} type="number" step={f.step ?? "1"} min={0} value={v[f.k]} onChange={n(f.k)} />
            </div>
          ))}
        </div>
        <div className="space-y-1.5 rounded-2xl bg-bg p-4 text-sm tabular-nums">
          <p className="flex justify-between"><span className="text-muted">Daily active</span><span>{Math.round(r.active).toLocaleString()}</span></p>
          <p className="flex justify-between"><span className="text-muted">Paying</span><span>{Math.round(r.pro).toLocaleString()}</span></p>
          <p className="flex justify-between"><span className="text-muted">Revenue</span><span>{money(r.revenue)}</span></p>
          <p className="flex justify-between"><span className="text-muted">Payment fees</span><span>−{money(r.fees)}</span></p>
          <p className="flex justify-between"><span className="text-muted">AI</span><span>−{money(r.ai)}</span></p>
          <p className="flex justify-between"><span className="text-muted">Platform</span><span>−{money(v.platform)}</span></p>
          <p className={`flex justify-between border-t border-line pt-1.5 text-base font-extrabold ${r.profit < 0 ? "text-danger" : "text-success"}`}>
            <span>Profit / month</span>
            <span>{money(r.profit)}</span>
          </p>
        </div>
      </div>
    </Card>
  );
}

type VoiceOption = { id: string; label: string; perStory: number };

/** AI narrator for stories: model, monthly allowance per plan, and what it can cost. */
export function VoiceForm({ choices, current, proPrice }: { choices: VoiceOption[]; current: { model: string; proPerMonth: number; freePerMonth: number }; proPrice: number }) {
  const router = useRouter();
  const [model, setModel] = useState(current.model);
  const [pro, setPro] = useState(String(current.proPerMonth));
  const [free, setFree] = useState(String(current.freePerMonth));
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const per = choices.find((c) => c.id === model)?.perStory ?? 0;
  const worstPro = per * (Number(pro) || 0);
  const share = proPrice > 0 ? worstPro / proPrice : 0;
  return (
    <Card>
      <CardHeader title="Story voice (AI narrator)" description="Free users always have the device voice. Audio is cached on the listener's phone, so replays cost nothing." />
      <div className="grid gap-4 px-5 pb-5 md:grid-cols-3">
        <div className="space-y-2 md:col-span-3">
          <Label htmlFor="voice-model">Model</Label>
          <Select id="voice-model" value={model} onChange={(e) => setModel(e.target.value)}>
            {choices.map((c) => (
              <option key={c.id} value={c.id}>{`${c.label}${c.perStory ? ` · ~$${c.perStory.toFixed(2)}/story` : ""}`}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="voice-pro">Pro · stories per month</Label>
          <Input id="voice-pro" type="number" min={0} max={200} value={pro} onChange={(e) => setPro(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="voice-free">Free · stories per month</Label>
          <Input id="voice-free" type="number" min={0} max={30} value={free} onChange={(e) => setFree(e.target.value)} />
        </div>
        <div className={`rounded-2xl p-3 text-sm ${share > 0.35 ? "bg-danger-soft text-danger" : "bg-bg"}`}>
          <p className="text-xs text-muted">Worst case per Pro user</p>
          <p className="font-bold">
            {money(worstPro)}/month{proPrice > 0 && ` · ${Math.round(share * 100)}% of the Pro price`}
          </p>
        </div>
        <div className="md:col-span-3 flex flex-wrap items-center gap-3">
          <Button
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await saveVoiceAction(model, Number(pro), Number(free));
                setMsg(r.error ? { tone: "danger", text: r.error } : { tone: "success", text: "Saved." });
                router.refresh();
              })
            }
          >
            Save voice
          </Button>
          <span className="text-xs text-muted">Billed to your Vercel account through AI Gateway.</span>
        </div>
        {msg && <div className="md:col-span-3"><Alert tone={msg.tone}>{msg.text}</Alert></div>}
      </div>
    </Card>
  );
}
