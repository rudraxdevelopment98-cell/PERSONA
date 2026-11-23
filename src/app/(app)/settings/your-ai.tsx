"use client";

import { useEffect, useState, useTransition } from "react";
import { Bot, ExternalLink, KeyRound, Link2, ShieldCheck, Unplug } from "lucide-react";
import { Alert, Badge, Button, Card, CardHeader, IconTile, Input, Label, Select, Spinner } from "@/components/ui";
import type { ConnectionSummary } from "@/lib/server/ai-connection";
import { connectWithKey, disconnectAI, listMyModels, setMyModel } from "./ai-actions";
import { useT } from "@/lib/i18n/client";

const PROVIDERS = [
  { id: "anthropic", label: "Claude (Anthropic)", keyUrl: "https://console.anthropic.com/settings/keys", placeholder: "sk-ant-…" },
  { id: "gemini", label: "Google Gemini", keyUrl: "https://aistudio.google.com/apikey", placeholder: "AIza…" },
  { id: "openai", label: "OpenAI", keyUrl: "https://platform.openai.com/api-keys", placeholder: "sk-…" },
  { id: "openrouter", label: "OpenRouter", keyUrl: "https://openrouter.ai/keys", placeholder: "sk-or-…" },
] as const;

const LABELS: Record<string, string> = Object.fromEntries(PROVIDERS.map((p) => [p.id, p.label]));

export function YourAI(props: {
  connection: ConnectionSummary;
  appProviderName: string;
  appModel: string;
  appIsFreeGemini: boolean;
  notice: string | null;
  error: string | null;
}) {
  const t = useT();
  const c = props.connection;
  const [provider, setProvider] = useState<(typeof PROVIDERS)[number]["id"]>("anthropic");
  const [key, setKey] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState(c?.model ?? "");
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(
    props.error ? { tone: "danger", text: props.error } : props.notice ? { tone: "success", text: props.notice } : null,
  );
  const [pending, start] = useTransition();
  const meta = PROVIDERS.find((p) => p.id === provider)!;

  useEffect(() => {
    if (!c) return;
    setModel(c.model);
    let cancelled = false;
    listMyModels().then((r) => {
      if (cancelled) return;
      setModels(r.models.includes(c.model) ? r.models : [c.model, ...r.models]);
      if (r.error) setMsg({ tone: "danger", text: r.error });
    });
    return () => {
      cancelled = true;
    };
  }, [c]);

  return (
    <Card id="your-ai" className="mb-6 scroll-mt-20">
      <CardHeader
        icon={
          <IconTile tone="accent">
            <Bot className="size-5" />
          </IconTile>
        }
        title={t("Your AI")}
        description={t("Choose which AI writes your stories, questions, feedback and coaching.")}
        action={c ? <Badge tone="success">{t("Connected")}</Badge> : <Badge>{t("Default")}</Badge>}
      />
      <div className="space-y-5 px-5 pb-5 pt-3">
        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}

        {c ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-accent-soft p-4">
              <ShieldCheck className="size-5 text-accent" />
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-bold">
                  {t(LABELS[c.provider])} {c.connectedVia === "oauth" ? t("(signed in)") : t("(key {0})", c.keyHint)}
                </p>
                <p className="text-muted">{t("Your own account is used and billed for your AI requests. The key is stored encrypted and never shown again.")}</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <Label htmlFor="ai-model">{t("Model")}</Label>
                <Select id="ai-model" value={model} onChange={(e) => setModel(e.target.value)} disabled={pending}>
                  {(models.length ? models : [model]).map((m) => (
                    <option key={m} value={m}>{t(m)}</option>
                  ))}
                </Select>
              </div>
              <Button
                variant="secondary"
                disabled={pending || model === c.model}
                onClick={() =>
                  start(async () => {
                    const r = await setMyModel(model);
                    setMsg(r.error ? { tone: "danger", text: r.error } : { tone: "success", text: `Now using ${model}.` });
                  })
                }
              >
                {pending && <Spinner />}{" "}{t("Save model")}</Button>
            </div>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await disconnectAI();
                  setMsg({ tone: "success", text: `Disconnected. Back to the default AI (${props.appProviderName}).` });
                })
              }
            >
              <Unplug className="size-4" />{" "}{t("Disconnect and delete key")}</Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted">{t("Now using the app's default:")}{" "}<span className="font-semibold text-ink">{props.appProviderName}</span> · {t(props.appModel)}.
              {props.appIsFreeGemini && t("It's free but can be slow at busy times, and Google may use submitted text to improve its products.")}
            </p>

            <div className="rounded-2xl border-2 border-dashed border-line p-4">
              <p className="text-sm font-bold">{t("Option 1 · Sign in with OpenRouter")}</p>
              <p className="mt-0.5 text-sm text-muted">{t("One click. Use Claude Haiku, Gemini, GPT and hundreds more from your own OpenRouter account (Google sign-in supported, some models are free).")}</p>
              <a
                href="/api/ai/openrouter/start"
                className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-card hover:bg-primary-hover"
              >
                <Link2 className="size-4" />{" "}{t("Connect with OpenRouter")}</a>
            </div>

            <div className="rounded-2xl border-2 border-dashed border-line p-4">
              <p className="text-sm font-bold">{t("Option 2 · Use your own API key")}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-[200px_1fr]">
                <div>
                  <Label htmlFor="ai-provider">{t("Provider")}</Label>
                  <Select id="ai-provider" value={provider} onChange={(e) => setProvider(e.target.value as typeof provider)}>
                    {PROVIDERS.map((p) => (
                      <option key={p.id} value={p.id}>{t(p.label)}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="ai-key">{t("API key")}</Label>
                  <Input
                    id="ai-key"
                    type="password"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder={t(meta.placeholder)}
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <a href={meta.keyUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                  <KeyRound className="size-3.5" />{" "}{t("Get a")}{" "}{t(meta.label)}{" "}{t("key")}{" "}<ExternalLink className="size-3" />
                </a>
                <Button
                  disabled={pending || key.trim().length < 10}
                  onClick={() =>
                    start(async () => {
                      setMsg(null);
                      const r = await connectWithKey(provider, key);
                      if (r.error) setMsg({ tone: "danger", text: r.error });
                      else {
                        setKey("");
                        setModels(r.models ?? []);
                        setMsg({ tone: "success", text: `Connected. Using ${r.model}. You can change the model below.` });
                      }
                    })
                  }
                >
                  {pending && <Spinner />}{" "}{t("Check & connect")}</Button>
              </div>
              <p className="mt-2 text-xs text-muted">{t("The key is checked with the provider, then encrypted (AES-256) before it is stored. It is only used for your requests.")}</p>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
