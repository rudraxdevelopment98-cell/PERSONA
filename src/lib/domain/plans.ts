/** Free vs Pro. The core daily programme is always free. */

export const FREE_LIMITS = {
  decisionsPerWeek: 3,
  communicationPerWeek: 3,
  coachPerDay: 10,
  circlesOwned: 1,
  activeRacesCreated: 2,
} as const;

export const TRIAL_DAYS = 7;

/** Default display prices (USD). The checkout shows the local price and tax for the buyer's country. */
export const DISPLAY_PRICES = { month: 4.99, year: 29 } as const;

export const FEATURES: { label: string; free: string | boolean; pro: string | boolean }[] = [
  { label: "Daily 30-minute session (check-in, story episode, scenarios, challenge, reflection)", free: true, pro: true },
  { label: "Initial assessment - Quick, Standard or Deep", free: true, pro: true },
  { label: "Progress tracking, XP, levels, badges, streaks", free: true, pro: true },
  { label: "Friends, cheers and comparisons", free: true, pro: true },
  { label: "Decision Lab scenarios", free: `${FREE_LIMITS.decisionsPerWeek} per week`, pro: "Unlimited" },
  { label: "Communication Lab exercises (type or speak)", free: `${FREE_LIMITS.communicationPerWeek} per week`, pro: "Unlimited" },
  { label: "AI Coach messages", free: `${FREE_LIMITS.coachPerDay} per day`, pro: "Unlimited" },
  { label: "Circles you can start", free: String(FREE_LIMITS.circlesOwned), pro: "Up to 5" },
  { label: "Races you can start at once", free: String(FREE_LIMITS.activeRacesCreated), pro: "Unlimited" },
  { label: "Pick the world for your next story season any time", free: "At each finale", pro: "Any time" },
  { label: "Pro badge on your profile", free: false, pro: true },
];

export type PlanInfo = {
  plan: "free" | "pro";
  status: "active" | "trialing" | "past_due" | "paused" | "canceled" | null;
  source: "paddle" | "trial" | "coupon" | "admin" | null;
  endsAt: string | null;
  cancelAt: string | null;
  billingCycle: "month" | "year" | null;
  trialAvailable: boolean;
  /** Limits don't apply: Pro, admins, or the user's own AI key pays for AI use. */
  unlimitedAI: boolean;
  isAdmin: boolean;
};
