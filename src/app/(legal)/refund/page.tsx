import { Contact, InShort, Updated } from "@/components/legal";
import { legalSettings } from "@/lib/server/legal";

export const metadata = { title: "Refund Policy" };
export const dynamic = "force-dynamic";

export default async function RefundPage() {
  const legal = await legalSettings();
  return (
    <>
      <h1>Refund and Cancellation Policy</h1>
      <Updated />
      <InShort
        items={[
          "Pehle 7 din Pro free try karo, card ki zaroorat nahi.",
          "Pehli payment ke 14 din ke andar poora refund maang sakte ho.",
          "Cancel karne par agli renewal ruk jaati hai; tab tak Pro chalta rahega.",
        ]}
      />

      <h2>Free trial</h2>
      <p>New accounts can use Pro free for 7 days. No card is needed, and nothing is charged when the trial ends; you simply return to the Free plan.</p>

      <h2>Cancelling</h2>
      <p>
        You can cancel Pro at any time from the pricing page (Manage subscription) or the link in your payment receipt. Cancelling stops the next
        renewal. You keep Pro until the end of the period you have paid for.
      </p>

      <h2>Refunds</h2>
      <ul>
        <li>First payment for a monthly or yearly plan: full refund if you ask within 14 days of that payment.</li>
        <li>After 14 days, or for renewals, we do not give partial refunds, but cancelling stops future charges.</li>
        <li>If you were charged by mistake (for example twice), we will refund the extra charge.</li>
      </ul>
      <p>
        Website payments are processed by Paddle, our Merchant of Record. Approved refunds go back to the original payment method, usually within 5 to 10
        working days, depending on your bank. Purchases made through an app store follow that store&apos;s refund rules.
      </p>

      <h2>How to ask</h2>
      <p>
        <Contact legal={legal} /> Please include the email on your account and the date of the payment.
      </p>
    </>
  );
}
