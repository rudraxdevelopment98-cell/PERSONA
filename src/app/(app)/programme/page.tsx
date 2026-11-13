import { Check } from "lucide-react";
import { Badge, Card, CardHeader, PageHeader, cx } from "@/components/ui";
import { DIMENSION_META } from "@/lib/domain/dimensions";
import { PHASES, focusForDay } from "@/lib/domain/programme";
import { getUserState } from "@/lib/server/state";

export const metadata = { title: "90-Day Programme" };

export default async function ProgrammePage() {
  const { supabase, user, state } = await getUserState();
  const { data: sessions } = await supabase.from("daily_sessions").select("day_number, focus_skill, completed_at, challenge_status").eq("user_id", user.id);
  const byDay = new Map((sessions ?? []).map((s) => [s.day_number as number, s]));
  const roadmap = state.profile.development_profile?.roadmap ?? [];

  return (
    <>
      <PageHeader
        title="90-Day Programme"
        description={
          state.day > 0
            ? `You are on day ${state.day}. Each phase cycles through five focus areas; every third day targets one of your weakest skills.`
            : "Your programme starts when you complete the initial assessment."
        }
      />
      <div className="space-y-6">
        {PHASES.map((phase) => {
          const personal = roadmap.find((r) => r.phase === phase.number);
          const days = Array.from({ length: phase.days[1] - phase.days[0] + 1 }, (_, i) => phase.days[0] + i);
          const done = days.filter((d) => byDay.get(d)?.completed_at).length;
          const current = state.day >= phase.days[0] && state.day <= phase.days[1];
          return (
            <Card key={phase.number}>
              <CardHeader
                title={
                  <span className="flex items-center gap-2">
                    Phase {phase.number}: {phase.name} {current && <Badge tone="primary">Current</Badge>}
                  </span>
                }
                description={`Days ${phase.days[0]}–${phase.days[1]} · ${phase.summary}`}
                action={<span className="text-xs tabular-nums text-muted">{done}/30 done</span>}
              />
              {personal && (
                <div className="border-b border-line bg-bg/60 px-5 py-3.5 text-sm leading-relaxed">
                  <p><span className="font-medium">Your goal:</span> {personal.goal}</p>
                  <p className="mt-1 text-muted">{personal.personal_emphasis}</p>
                </div>
              )}
              <ol className="grid divide-y divide-line sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-3">
                {days.map((d) => {
                  const s = byDay.get(d);
                  const f = focusForDay(d, state.weakest);
                  const isToday = d === state.day;
                  return (
                    <li key={d} className={cx("flex items-center gap-3 px-5 py-2.5 sm:border-b sm:border-line", isToday && "bg-primary-soft")}>
                      <span
                        className={cx(
                          "flex size-7 shrink-0 items-center justify-center rounded-full text-xs tabular-nums",
                          s?.completed_at ? "bg-success text-white" : isToday ? "border-2 border-primary font-semibold" : d < state.day ? "border border-line text-muted" : "bg-bg text-muted",
                        )}
                      >
                        {s?.completed_at ? <Check className="size-3.5" strokeWidth={3} /> : d}
                      </span>
                      <div className="min-w-0">
                        <p className={cx("truncate text-sm", d > state.day ? "text-muted" : "text-ink")}>{f.title.replace(" - applied to your growth area", "")}</p>
                        <p className="truncate text-xs text-muted">
                          {DIMENSION_META[f.dimension].label}
                          {f.personalised ? " · personalised" : ""}
                          {s?.challenge_status === "completed" ? " · challenge done" : ""}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </Card>
          );
        })}
      </div>
    </>
  );
}
