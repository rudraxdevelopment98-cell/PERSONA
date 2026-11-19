import { Card, CardHeader, PageHeader } from "@/components/ui";
import { DISPLAY_PRICES } from "@/lib/domain/plans";
import { androidSettings, listCoupons } from "@/lib/server/admin";
import { ANDROID_PACKAGE, UPLOAD_KEY_SHA256 } from "@/lib/domain/android";
import { adminConfig, revenueStats } from "@/lib/server/payments";
import { requestOrigin } from "@/lib/server/origin";
import { AndroidApp, CouponManager, GrantPro, PaymentSettings } from "./plans-ui";

export const metadata = { title: "Plans · Admin" };

export default async function AdminPlans() {
  const [config, coupons, rev, origin] = await Promise.all([adminConfig(), listCoupons(), revenueStats(), requestOrigin()]);
  const paid = rev.paid ?? { month: 0, year: 0 };
  const mrr = paid.month * DISPLAY_PRICES.month + (paid.year * DISPLAY_PRICES.year) / 12;
  const total = rev.bySource.reduce((a, r) => a + r.n, 0);
  return (
    <>
      <PageHeader eyebrow="Admin" title="Plans & payments" description="Pro access, codes, gifts and the Paddle connection." />
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Pro users now</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums">{total}</p>
            <p className="text-xs text-muted">{rev.bySource.map((r) => `${r.n} ${r.source}`).join(" · ") || "none yet"}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Paying monthly</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums">{paid.month}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Paying yearly</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums">{paid.year}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Est. monthly revenue</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums">${mrr.toFixed(2)}</p>
            <p className="text-xs text-muted">at list price, before tax and fees</p>
          </Card>
        </div>
        <PaymentSettings config={config} webhookUrl={`${origin}/api/payments/paddle`} />
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader title="Gift Pro" description="Give someone Pro for a number of days." />
            <div className="px-5 pb-5">
              <GrantPro />
            </div>
          </Card>
          <Card>
            <CardHeader title="Codes" description="Promo codes users redeem on the pricing page." />
            <div className="px-5 pb-5">
              <CouponManager coupons={coupons} />
            </div>
          </Card>
        </div>
        <AndroidApp pkg={ANDROID_PACKAGE} uploadKey={UPLOAD_KEY_SHA256} fingerprints={(await androidSettings()).fingerprints} />
      </div>
    </>
  );
}
