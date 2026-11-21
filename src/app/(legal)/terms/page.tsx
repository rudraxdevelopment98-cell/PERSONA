import Link from "next/link";
import { Contact, InShort, Updated } from "@/components/legal";
import { legalSettings } from "@/lib/server/legal";

export const metadata = { title: "Terms of Service" };
export const dynamic = "force-dynamic";

export default async function TermsPage() {
  const legal = await legalSettings();
  return (
    <>
      <h1>Terms of Service</h1>
      <Updated />
      <InShort
        items={[
          "PERSONA 90 self-development ke liye hai, therapy ya medical ilaaj nahi.",
          "Aapko 18 saal ya usse bade hona chahiye.",
          "Jo aap likhte ho wo aapka hai; hum use sirf aapka programme chalane ke liye use karte hain.",
          "Pro kabhi bhi cancel karo; refund ke niyam Refund Policy mein hain.",
        ]}
      />

      <h2>1. Agreement</h2>
      <p>
        These terms are an agreement between you and {legal.business} for the PERSONA 90 website and apps (the &ldquo;service&rdquo;). By creating an
        account you agree to them and to our <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>2. Who can use it</h2>
      <p>You must be 18 or older and able to enter a binding contract. One account per person; keep your password and recovery codes safe.</p>

      <h2>3. What the service is, and is not</h2>
      <p>
        PERSONA 90 is a 90-day self-development programme with AI-generated stories, practice and feedback for confidence, communication and decisions.
        It is not therapy, counselling, medical or legal advice, and it does not diagnose any condition. AI output can be inaccurate or incomplete; use
        your own judgement. If you are in distress or danger, contact local emergency services or, in India, Tele-MANAS on 14416.
      </p>

      <h2>4. Your content</h2>
      <p>
        You own what you write and create in the app. You give us a limited licence to store and process it only to provide the service to you (including
        sending it to AI providers as described in the Privacy Policy) and to show friends what you choose to share. You can export or delete it at any
        time.
      </p>

      <h2>5. Fair use</h2>
      <ul>
        <li>No harassment, hate, threats or sexual content towards anyone, including in captions, notes and cheers.</li>
        <li>No illegal content, spam, impersonation, or trying to get other people&apos;s data.</li>
        <li>No attempts to break, overload, scrape or reverse-engineer the service, or to misuse the AI features.</li>
      </ul>
      <p>You can report or block people from their profile or circle. We may remove content, limit features or suspend accounts that break these rules.</p>

      <h2>6. Plans and payments</h2>
      <p>
        The Free plan has limits shown on the <Link href="/pricing">pricing page</Link>, and we may change them. Pro is a subscription that renews
        automatically each month or year until you cancel. New accounts can try Pro free for 7 days without a card. Payments on the website are
        processed by Paddle, our Merchant of Record, which also handles taxes and invoices. Prices may change; we will tell you before a change applies
        to your renewal. Refunds follow our <Link href="/refund">Refund Policy</Link>.
      </p>

      <h2>7. Ending your account</h2>
      <p>
        You can delete your account at any time in Settings. We may suspend or close an account that breaks these terms or the law, and will tell you why
        unless the law prevents us.
      </p>

      <h2>8. Liability</h2>
      <p>
        The service is provided &ldquo;as is&rdquo;. To the extent the law allows, we are not liable for indirect or consequential losses, and our total
        liability is limited to the amount you paid us in the 12 months before the claim. Nothing here limits rights you have under consumer law.
      </p>

      <h2>9. Changes and law</h2>
      <p>
        We may update these terms; for meaningful changes we will ask you to agree again in the app. These terms are governed by the laws of India.
        Disputes go first to our support and grievance contact: <Contact legal={legal} grievance />
      </p>
    </>
  );
}
