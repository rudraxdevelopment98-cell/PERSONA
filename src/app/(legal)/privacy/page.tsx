import { Contact, InShort, Updated } from "@/components/legal";
import { legalSettings } from "@/lib/server/legal";

export const metadata = { title: "Privacy Policy" };
export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  const legal = await legalSettings();
  return (
    <>
      <h1>Privacy Policy</h1>
      <Updated />
      <InShort
        items={[
          "Hum aapka data bechte nahi, aur ads ke liye use nahi karte.",
          "Journal, answers aur coach chats sirf aapke hain. Dost sirf wahi dekhte hain jo aap share karte ho.",
          "AI ko sirf utna bheja jaata hai jitna aapka session banane ke liye zaroori hai.",
          "Settings se kabhi bhi apna poora data download ya delete kar sakte ho.",
        ]}
      />

      <h2>1. Who we are</h2>
      <p>
        This policy explains how {legal.business} (&ldquo;we&rdquo;) handles personal data when you use the PERSONA 90 website and apps. We are the
        Data Fiduciary for your data under India&apos;s Digital Personal Data Protection Act, 2023 and the DPDP Rules, 2025. Contact: <Contact legal={legal} />
      </p>

      <h2>2. What we collect</h2>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Examples</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Account</td>
            <td>First name, email, password (stored only as a secure hash), recovery codes and security answers (hashed)</td>
          </tr>
          <tr>
            <td>Profile and settings</td>
            <td>Language, time zone, goal, avatar emoji, cover, one-line bio, reminder and sharing choices</td>
          </tr>
          <tr>
            <td>Programme content you create</td>
            <td>Assessment answers and scores, daily check-ins (including the optional &ldquo;what happened today&rdquo; note), story choices, scenario answers, reflections, challenge notes, journal entries, AI Coach chats, Decision and Communication Lab answers</td>
          </tr>
          <tr>
            <td>Social</td>
            <td>Friends, circles, races, cheers, moments, reactions, nudges, reports and blocks</td>
          </tr>
          <tr>
            <td>Payments</td>
            <td>Plan, trial and subscription status from our payment provider. We never see or store your card or UPI details.</td>
          </tr>
          <tr>
            <td>Technical</td>
            <td>IP address and device information for security and rate limiting, push-notification subscription, counts and costs of AI requests (not their content)</td>
          </tr>
        </tbody>
      </table>
      <p>
        Voice input (the mic button on answer boxes) only listens while the listening screen is open. The short recording is sent to our AI
        provider to turn it into text in your language and is then discarded: we never store your audio, only the text you choose to save. If no
        AI model is available, your browser or phone does the speech-to-text instead. Speech-to-text in the Communication Lab&apos;s voice practice
        is done by your browser or phone. The &ldquo;HD voice&rdquo;
        reads stories aloud on your device. The optional AI narrator creates audio from the story text only.
      </p>

      <h2>3. Why we use it</h2>
      <ul>
        <li>To run your 90-day programme: create sessions, stories, feedback and progress, personalised to you.</li>
        <li>To show friends and circles only the progress you choose to share.</li>
        <li>To send reminders and notifications you have switched on (you can switch them off any time).</li>
        <li>To take payments, prevent abuse and keep the service secure.</li>
        <li>To improve the product using totals and trends, not by reading individual entries.</li>
      </ul>
      <p>We do not sell personal data, and we do not use it for advertising. Sponsor messages in the app are not targeted using your personal data.</p>

      <h2>4. AI processing</h2>
      <p>
        To generate your sessions and feedback, the text needed for that request (for example today&apos;s check-in answers and a short summary of your
        progress) is sent to an AI model provider through an API: Google Gemini, or Vercel&apos;s AI Gateway, which routes to model providers. If you
        connect your own AI account in Settings, your requests go to that provider instead. Your journal is not sent to the AI unless you choose to share
        it with the Coach. AI output can be wrong; it is guidance for self-development, not professional advice.
      </p>

      <h2>5. Who can see your data</h2>
      <ul>
        <li>You.</li>
        <li>Friends and circle members: only the items you share in Friends → Privacy. Pausing sharing hides everything.</li>
        <li>
          Our service providers, only to run the service: Vercel (hosting), Neon (database), the AI providers above, Paddle (payments, as Merchant of
          Record) and your browser&apos;s push service.
        </li>
        <li>A small number of authorised admins, only for support, safety reports and legal duties. Admin actions are logged.</li>
        <li>Authorities, when the law requires it.</li>
      </ul>
      <p>Our providers may store and process data outside India, with security measures in place.</p>

      <h2>6. How long we keep it</h2>
      <p>
        <strong>Your own words are kept only briefly.</strong> What you write or say in check-ins, reflections, story lines, the Decision and
        Communication Labs, the AI coach and the &ldquo;held back&rdquo; part of the assessment is turned into private persona signals: a few
        tags from a fixed list (for example a feeling, a type of situation, a thinking pattern, the role of the other person such as
        &ldquo;parent&rdquo;) and numbers (stress, confidence, mood, skill evidence). The signals cannot contain names, places or quotes. Your own
        words are then deleted after 48 hours, and after 7 days at the latest; coach conversations are deleted after 48 hours. The signals build a
        persona profile (a type, levels and tags) that personalises your programme. You can see it and delete it at any time in Me &rarr; My
        persona. Your journal is your diary: it is kept until you delete it and is never turned into signals.
      </p>
      <p>
        We keep your data while your account is active. If you delete your account, your data is removed from our live database straight away and from
        backups when they expire. We may keep payment records for as long as tax law requires. Accounts that stay inactive for a long period may be deleted
        after we notify you, as the law requires.
      </p>

      <h2>7. Your rights</h2>
      <ul>
        <li>
          <b>Access:</b> download all your data any time from Settings → Export all data.
        </li>
        <li>
          <b>Correction:</b> edit your profile, settings and entries in the app, or ask us.
        </li>
        <li>
          <b>Erasure and withdrawing consent:</b> Settings → Delete my account removes your data. You can also switch off sharing and reminders at any time.
        </li>
        <li>
          <b>Nominee:</b> you can name someone to use these rights for you if you die or become unable to; write to us.
        </li>
        <li>
          <b>Grievance:</b> contact our Grievance Officer: <Contact legal={legal} grievance />. If you are not satisfied with our answer, you can complain to
          the Data Protection Board of India.
        </li>
      </ul>

      <h2>8. Age</h2>
      <p>PERSONA 90 is for people aged 18 and over. If we learn that an account belongs to someone under 18, we will delete it.</p>

      <h2>9. Security</h2>
      <p>
        Data is encrypted in transit. Passwords and recovery answers are hashed; connected AI keys are encrypted. Each person&apos;s records are protected by
        database row-level security. If a personal-data breach affects you, we will tell you and the Data Protection Board as the law requires.
      </p>

      <h2>10. Changes</h2>
      <p>If we change this policy in a meaningful way, we will show the new version in the app and ask you to agree again before you continue.</p>
    </>
  );
}
