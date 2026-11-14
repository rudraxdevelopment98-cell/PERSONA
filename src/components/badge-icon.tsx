import { BookOpen, Check, CircleDot, Flag, Flame, GitBranch, Heart, MessagesSquare, Mic, PenLine, Star, Target, Trophy, Users, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  flag: Flag,
  check: Check,
  book: BookOpen,
  flame: Flame,
  mic: Mic,
  target: Target,
  branch: GitBranch,
  chat: MessagesSquare,
  pen: PenLine,
  star: Star,
  trophy: Trophy,
  users: Users,
  circle: CircleDot,
  heart: Heart,
};

export function BadgeIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Trophy;
  return <Icon className={className} />;
}
