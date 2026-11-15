"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Gift, Minus, Sparkles } from "lucide-react";
import { Alert, Button, ButtonLink, Card, Input, cx } from "@/components/ui";
import type { PlanInfo } from "@/lib/domain/plans";
import type { PublicPaymentConfig } from "@/lib/server/payments";
import { portalAction, redeemCouponAction, startTrialAction } from "./actions";

type PaddleGlobal = {
  Environment: { set: (env: string) => void };
  Initialize: (opts: { token: string; eventCallback?: (e: { name?: string }) => void }) => void;
  Checkout: { open: (opts: Record<string, unknown>) => void };
  PricePreview: (req: { items: { priceId: string; quantity: number }[] }) => Promise<{
    data: { details: { lineItems: { price: { id: string }; formattedTotals: { total: string } }[] } };
  }>;
};
declare global {
  interface Window {
    Paddle?: PaddleGlobal;
  }
}

function usePaddle(config: PublicPaymentConfig, onComplete: () => void) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!config.enabled) return;
    const init = () => {
      const P = window.Paddle;
      if (!P) return;
      if (config.env === "sandbox") P.Environment.set("sandbox");
      P.Initialize({ token: config.clientToken, eventCallback: (e) => e.name === "checkout.completed" && onComplete() });
      setReady(true);
    };
    if (window.Paddle) return init();
    const s = document.createElement("script");
    s.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    s.async = true;
    s.onload = init;
    document.head.appendChild(s);
    // Load once per page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.enabled]);
  return ready;
}

export function PricingClient({
  signedIn,
  email,
  userId,
  plan,
  config,
  prices,
  features,
  justPaid,
}: {
  signedIn: boolean;
  email: string | null;
  userId: string | null;
  plan: PlanInfo | null;
  config: PublicPaymentConfig;
  prices: { month: number; year: number };
  features: { label: string; free: string | boolean; pro: string | boolean }[];
  justPaid: boolean;
}) {
  const router = useRouter();
  const [cycle, setCycle] = useState<"month" | "year">("year");
  const [local, setLocal] = useState<{ month?: string; year?: string }>({});
  const [msg, setMsg] = useState<{ tone: "success" | "danger" | "warning"; text: string } | null>(
    justPaid ? { tone: "success", text: "Thank you! Your payment went through. Pro turns on within a minute." } : null,
  );
  const [code, setCode] = useState("");
  const [pending, start] = useTransition();
  const paddleReady = usePaddle(config, () => {
    setMsg({ tone: "success", text: "Thank you! Your payment went through. Pro turns on within a minute." });
    setTimeout(() => router.refresh(), 4000);
  });

  // Show prices in the visitor's own currency once Paddle is ready.
  useEffect(() => {
    if (!paddleReady || !window.Paddle) return;
    const items = [config.priceMonth, config.priceYear].filter(Boolean).map((priceId) => ({ priceId, quantity: 1 }));
    window.Paddle.PricePreview({ items })
      .then((r) => {
        const out: { month?: string; year?: string } = {};
        for (const li of r.data.details.lineItems) {
          if (li.price.id === config.priceMonth) out.month = li.formattedTotals.total;
          if (li.price.id === config.priceYear) out.year = li.formattedTotals.total;
        }
        setLocal(out);
      })
      .catch(() => {});
  }, [paddleReady, config.priceMonth, config.priceYear]);

  const isPro = plan?.plan === "pro";
  const priceLabel = cycle === "month" ? (local.month ?? `$${prices.month}`) : (local.year ?? `$${prices.year}`);
  const perMonth = cycle === "year" && !local.year ? ` ($${(prices.year / 12).toFixed(2)}/month)` : "";
  const saving = Math.round((1 - prices.year / (prices.month * 12)) * 100);

  const checkout = () => {
    const priceId = cycle === "month" ? config.priceMonth : config.priceYear || config.priceMonth;
    window.Paddle?.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customer: email ? { email } : undefined,
      customData: { user_id: userId },
      settings: { successUrl: `${location.origin}/pricing?checkout=success`, theme: "light", displayMode: "overlay" },
    });
  };

  const act = (fn: () => Promise<{ error?: string } & Record<string, unknown>>, ok: (r: Record<string, unknown>) => string) =>
    start(async () => {
      const r = await fn();
      if (r.error) setMsg({ tone: "danger", text: r.error });
      else {
        setMsg({ tone: "success", text: ok(r) });
        router.refresh();
      }
    });

  return (
    <div className="space-y-8">
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}

      <div className="flex justify-center">
        <div className="inline-flex rounded-full border border-line bg-surface p-1 text-sm font-semibold" role="radiogroup" aria-label="Billing period">
          {(["month", "year"] as const).map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={cycle === c}
              onClick={() => setCycle(c)}
              className={cx("rounded-full px-4 py-1.5", cycle === c ? "bg-primary text-white" : "text-muted")}
            >
              {c === "month" ? "Monthly" : `Yearly · save ${saving}%`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <p className="text-sm font-bold uppercase tracking-wider text-muted">Free</p>
          <p className="mt-2 text-4xl font-extrabold">$0</p>
          <p className="text-sm text-muted">forever</p>
          <p className="mt-4 text-sm">The complete 90-day programme: a new story episode, scenarios and a real-world challenge every day, plus friends and progress tracking.</p>
          <div className="mt-6">
            {signedIn ? (
              <span className="inline-flex h-10 items-center rounded-xl bg-bg px-4 text-sm font-semibold text-muted">{isPro ? "Included in Pro" : "Your current plan"}</span>
            ) : (
              <ButtonLink href="/signup" variant="secondary">Start free</ButtonLink>
            )}
          </div>
        </Card>

        <Card className="relative border-primary p-6 ring-4 ring-primary/10">
          <span className="absolute right-4 top-4 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">Most popular</span>
          <p className="inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-primary">
            <Sparkles className="size-4" /> Pro
          </p>
          <p className="mt-2 text-4xl font-extrabold">
            {priceLabel}
            <span className="text-base font-semibold text-muted">/{cycle === "month" ? "month" : "year"}</span>
          </p>
          <p className="text-sm text-muted">{cycle === "year" ? `billed yearly${perMonth}` : "billed monthly"} · local currency and taxes at checkout</p>
          <p className="mt-4 text-sm">Unlimited Decision Lab, Communication Lab and AI coaching, more circles and races, and full control of your story seasons.</p>
          <div className="mt-6 space-y-2">
            {!signedIn ? (
              <ButtonLink href="/signup">Start free - try Pro later</ButtonLink>
            ) : isPro ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-success">
                  You have Pro{plan?.source === "paddle" ? "" : plan?.source === "trial" ? " (free trial)" : plan?.source === "admin" ? " (gift)" : plan?.source === "coupon" ? " (code)" : ""}
                  {plan?.endsAt ? ` · ${plan.cancelAt || plan.source !== "paddle" ? "until" : "renews"} ${new Date(plan.cancelAt ?? plan.endsAt).toLocaleDateString()}` : ""}
                </p>
                {plan?.source === "paddle" && (
                  <Button variant="secondary" disabled={pending} onClick={() => act(portalAction as never, (r) => (window.open(String(r.url), "_blank", "noopener"), "Opening your billing portal…"))}>
                    Manage subscription
                  </Button>
                )}
                {plan?.source !== "paddle" && config.enabled && (
                  <Button variant="secondary" onClick={checkout} disabled={!paddleReady}>Subscribe to keep Pro</Button>
                )}
              </div>
            ) : (
              <>
                {plan?.trialAvailable && (
                  <Button className="w-full" disabled={pending} onClick={() => act(startTrialAction as never, () => "Your 7-day Pro trial has started. Enjoy!")}>
                    <Gift className="size-4" /> Start 7-day free trial - no card
                  </Button>
                )}
                {config.enabled ? (
                  <Button className="w-full" variant={plan?.trialAvailable ? "secondary" : "primary"} onClick={checkout} disabled={!paddleReady}>
                    <Sparkles className="size-4" /> {paddleReady ? `Upgrade - ${priceLabel}/${cycle === "month" ? "month" : "year"}` : "Loading checkout…"}
                  </Button>
                ) : (
                  !plan?.trialAvailable && <p className="text-sm text-muted">Paid plans are opening soon. Have a code? Redeem it below.</p>
                )}
              </>
            )}
          </div>
        </Card>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="px-5 py-3 font-semibold">What you get</th>
              <th className="px-5 py-3 text-center font-semibold">Free</th>
              <th className="px-5 py-3 text-center font-semibold text-primary">Pro</th>
            </tr>
          </thead>
          <tbody>
            {features.map((f) => (
              <tr key={f.label} className="border-b border-line last:border-0">
                <td className="px-5 py-3">{f.label}</td>
                {[f.free, f.pro].map((v, i) => (
                  <td key={i} className="px-5 py-3 text-center">
                    {v === true ? <Check className="mx-auto size-4 text-success" /> : v === false ? <Minus className="mx-auto size-4 text-muted" /> : <span className={i === 1 ? "font-semibold" : "text-muted"}>{v}</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {signedIn && (
        <Card className="mx-auto max-w-md p-5">
          <p className="font-semibold">Have a code?</p>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              act(() => redeemCouponAction(code) as never, (r) => `Code applied: ${r.days} days of Pro added.`);
              setCode("");
            }}
          >
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. FRIENDS30" aria-label="Code" maxLength={32} />
            <Button variant="secondary" disabled={pending || code.trim().length < 4}>Redeem</Button>
          </form>
        </Card>
      )}
    </div>
  );
}
