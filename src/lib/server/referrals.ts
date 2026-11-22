import "server-only";
import { getPool } from "@/lib/db/pool";
import { grantPro } from "./plan";
import { nameOf, notify } from "./social";

export const REFERRAL_DAYS = 7;
/** At most this many rewarded referrals per inviter per year. */
const YEARLY_CAP = 12;

/**
 * Called when someone completes a session. On their first one, if a friend invited them,
 * both get 7 days of Pro. Idempotent: the referral row is claimed once.
 */
export async function rewardReferral(inviteeId: string): Promise<{ days: number; inviterName: string } | null> {
  const pool = getPool();
  const { rows } = await pool.query<{ inviter: string }>(
    `update public.referrals r set rewarded_at = now()
      where r.invitee = $1 and r.rewarded_at is null
        and (select count(*) from public.daily_sessions s where s.user_id = $1 and s.completed_at is not null) >= 1
        and (select count(*) from public.referrals x where x.inviter = r.inviter and x.rewarded_at > now() - interval '365 days') < $2
      returning r.inviter`,
    [inviteeId, YEARLY_CAP],
  );
  const inviter = rows[0]?.inviter;
  if (!inviter) return null;
  await grantPro(inviteeId, REFERRAL_DAYS, "referral");
  await grantPro(inviter, REFERRAL_DAYS, "referral");
  const [inviteeName, inviterName] = await Promise.all([nameOf(inviteeId), nameOf(inviter)]);
  await notify(inviter, "referral_reward", {
    title: `🎁 ${inviteeName} ne pehla episode poora kiya!`,
    body: `Tum dono ko ${REFERRAL_DAYS} din Pro free mila. Thank you for bringing a friend.`,
    url: "/friends",
  });
  return { days: REFERRAL_DAYS, inviterName };
}
