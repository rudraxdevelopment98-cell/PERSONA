import { AppNav } from "@/components/app-nav";
import { getUserState } from "@/lib/server/state";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { state } = await getUserState();
  const name = state.profile.display_name || state.email?.split("@")[0] || "You";
  return (
    <div className="min-h-screen">
      <AppNav name={name} day={state.day} />
      <main className="lg:pl-60">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
