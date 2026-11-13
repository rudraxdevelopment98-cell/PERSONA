import { Card, CardHeader, PageHeader } from "@/components/ui";
import { activeProvider } from "@/lib/ai/client";
import { getUserState } from "@/lib/server/state";
import { SettingsForm } from "./form";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { state } = await getUserState();
  const ai = activeProvider();
  const providerName = { gemini: "Google Gemini", anthropic: "Claude (Anthropic API)", gateway: "Claude (Vercel AI Gateway)" }[ai.kind];
  return (
    <>
      <PageHeader title="Settings" description="Your profile, privacy and data." />
      <Card className="mb-6">
        <CardHeader title="AI provider" description="Generates your sessions, feedback and coaching. Your text is sent to this provider only to produce your content." />
        <div className="px-5 py-4 text-sm">
          <p>
            <span className="font-medium">{providerName}</span> <span className="text-muted">· {ai.model}</span>
          </p>
          {ai.kind === "gemini" && (
            <p className="mt-1.5 text-xs leading-relaxed text-muted">
              On Google&apos;s free tier, Google may use submitted content to improve its products. Avoid writing details you would not want shared.
            </p>
          )}
        </div>
      </Card>
      <SettingsForm
        email={state.email ?? ""}
        displayName={state.profile.display_name ?? ""}
        timezone={state.profile.timezone}
        coachJournalAccess={state.profile.coach_journal_access}
        startDate={state.profile.programme_start_date}
      />
    </>
  );
}
