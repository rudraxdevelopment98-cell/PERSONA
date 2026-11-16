import Link from "next/link";
import { ChevronRight, GitBranch, Mic, MessagesSquare, Sparkles } from "lucide-react";
import { Card, IconTile, PageHeader } from "@/components/ui";

export const metadata = { title: "Practice" };

const ITEMS = [
  { href: "/decision-lab", title: "Decision Lab", text: "Make tough calls", icon: GitBranch, tone: "sky" as const },
  { href: "/communication-lab", title: "Communication Lab", text: "Say it out loud", icon: MessagesSquare, tone: "coral" as const, extra: "Voice" },
  { href: "/coach", title: "AI Coach", text: "Talk it through", icon: Sparkles, tone: "accent" as const },
];

export default function PracticePage() {
  return (
    <>
      <PageHeader eyebrow="Practice" title="Train your skills" description="Short, focused exercises you can do any time. Each one earns XP and improves your scores." />
      <div className="space-y-3">
        {ITEMS.map((i) => (
          <Link key={i.href} href={i.href} className="block">
            <Card className="flex items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-raised">
              <IconTile tone={i.tone} size="lg">
                <i.icon className="size-6" />
              </IconTile>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-bold">
                  {i.title}
                  {i.extra && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-coral-soft px-2 py-0.5 text-[11px] font-bold text-coral">
                      <Mic className="size-3" /> {i.extra}
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-sm text-muted">{i.text}</p>
              </div>
              <ChevronRight className="size-5 text-muted" />
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
