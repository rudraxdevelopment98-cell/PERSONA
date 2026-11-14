import { PageHeader } from "@/components/ui";
import { appProvider } from "@/lib/ai/client";
import { getConnectionSummary } from "@/lib/server/ai-connection";
import { recoveryStatus, securityQuestionsSet } from "@/lib/server/recovery";
import { getUserState } from "@/lib/server/state";
import { SettingsForm } from "./form";
import { SecuritySettings } from "./security";
import { YourAI } from "./your-ai";

export const metadata = { title: "Settings" };

const APP_PROVIDER_NAMES: Record<string, string> = {
  gemini: "Google Gemini (free)",
  anthropic: "Claude (Anthropic API)",
  gateway: "Claude (Vercel AI Gateway)",
};

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ ai?: string; ai_error?: string }> }) {
  const [{ db, user, state }, params] = await Promise.all([getUserState(), searchParams]);
  const [connection, recovery, questions] = await Promise.all([getConnectionSummary(db, user.id), recoveryStatus(db, user.id), securityQuestionsSet(db, user.id)]);
  const app = appProvider();
  return (
    <>
      <PageHeader title="Settings" description="Your profile, AI, privacy and data." />
      <YourAI
        connection={connection}
        appProviderName={APP_PROVIDER_NAMES[app.kind] ?? app.kind}
        appModel={app.model}
        appIsFreeGemini={app.kind === "gemini"}
        notice={params.ai === "connected" ? "OpenRouter connected. Your sessions now use your own AI." : null}
        error={params.ai_error ?? null}
      />
      <div className="mb-6">
        <SecuritySettings remaining={recovery.remaining} email={state.email ?? ""} questions={questions} />
      </div>
      <SettingsForm
        email={state.email ?? ""}
        displayName={state.profile.display_name ?? ""}
        timezone={state.profile.timezone}
        coachJournalAccess={state.profile.coach_journal_access}
        language={state.profile.language}
        startDate={state.profile.programme_start_date}
      />
    </>
  );
}
