import { appProvider } from "@/lib/ai/client";
import { getConnectionSummary } from "@/lib/server/ai-connection";
import { getUserState } from "@/lib/server/state";
import { YourAI } from "../your-ai";
import { SettingsSub } from "../sub";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Your AI" };

const NAMES: Record<string, string> = {
  gemini: "Google Gemini (free)", anthropic: "Claude (Anthropic API)", gateway: "Claude (Vercel AI Gateway)",
};

export default async function Page({ searchParams }: { searchParams: Promise<{ ai?: string; ai_error?: string }> }) {
  const t = await getT();
  const [{ db, user }, params] = await Promise.all([getUserState(), searchParams]);
  const connection = await getConnectionSummary(db, user.id);
  const app = appProvider();
  return (
    <SettingsSub title={t("Your AI")}>
      <YourAI
        connection={connection}
        appProviderName={NAMES[app.kind] ?? app.kind}
        appModel={app.model}
        appIsFreeGemini={app.kind === "gemini"}
        notice={params.ai === "connected" ? t("OpenRouter connected. Your sessions now use your own AI.") : null}
        error={params.ai_error ?? null}
      />
    </SettingsSub>
  );
}
