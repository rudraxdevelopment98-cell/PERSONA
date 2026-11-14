"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/db/server";
import { RACE_KINDS, SHARE_ITEM_IDS, type RaceKind, type ShareItem } from "@/lib/domain/social";
import { requestOrigin } from "@/lib/server/origin";
import { removeSubscription, saveSubscription, vapidKeys } from "@/lib/server/push";
import * as social from "@/lib/server/social";

type Result<T = object> = ({ error?: undefined } & T) | ({ error: string } & Partial<T>);

async function run<T extends object>(fn: (userId: string) => Promise<T>, revalidate: string[] = []): Promise<Result<T>> {
  const { user } = await requireUser();
  try {
    const out = await fn(user.id);
    for (const p of revalidate) revalidatePath(p, p === "/" ? "layout" : "page");
    return out;
  } catch (err) {
    if (err instanceof social.SocialError) return { error: err.message };
    console.error("[social action]", err);
    return { error: "Something went wrong. Please try again." };
  }
}

const id = z.string().min(1).max(64);
const uuid = z.string().uuid();

// Invites ---------------------------------------------------------------

export async function createInviteAction(input: { kind: "friend" | "circle"; circleId?: string | null }) {
  const parsed = z.object({ kind: z.enum(["friend", "circle"]), circleId: uuid.nullish() }).safeParse(input);
  if (!parsed.success) return { error: "Invalid invite." };
  return run(async (userId) => {
    const token = await social.createInvite(userId, parsed.data.kind, parsed.data.circleId ?? null);
    const origin = await requestOrigin();
    return { url: `${origin}/i/${token}` };
  });
}

export async function revokeInviteAction(inviteId: string) {
  if (!uuid.safeParse(inviteId).success) return { error: "Invalid invite." };
  return run(async (userId) => (await social.revokeInvite(userId, inviteId), {}), ["/friends"]);
}

export async function acceptInviteAction(token: string) {
  if (!z.string().min(10).max(64).safeParse(token).success) return { error: "This invite link isn't valid." };
  const res = await run((userId) => social.redeemInvite(userId, token), ["/"]);
  (await cookies()).delete("p90_invite");
  if (res.error !== undefined) return { error: res.error };
  redirect(res.circleId ? `/circles/${res.circleId}` : "/friends?joined=1");
}

export async function dismissInviteAction() {
  (await cookies()).delete("p90_invite");
  revalidatePath("/", "layout");
}

// Friends ---------------------------------------------------------------

export async function removeFriendAction(other: string) {
  if (!id.safeParse(other).success) return { error: "Invalid user." };
  return run(async (userId) => (await social.removeFriend(userId, other), {}), ["/friends"]);
}

export async function blockAction(other: string) {
  if (!id.safeParse(other).success) return { error: "Invalid user." };
  return run(async (userId) => (await social.blockUser(userId, other), {}), ["/friends"]);
}

export async function unblockAction(other: string) {
  if (!id.safeParse(other).success) return { error: "Invalid user." };
  return run(async (userId) => (await social.unblockUser(userId, other), {}), ["/friends/sharing"]);
}

export async function reportAction(input: { userId?: string; circleId?: string; reason: string; details: string }) {
  const parsed = z
    .object({ userId: id.optional(), circleId: uuid.optional(), reason: z.string().trim().min(2).max(60), details: z.string().trim().max(1000) })
    .safeParse(input);
  if (!parsed.success) return { error: "Please choose a reason." };
  return run(async (userId) => (await social.report(userId, parsed.data, parsed.data.reason, parsed.data.details), {}));
}

// Sharing ---------------------------------------------------------------

export async function setSharingAction(input: { circleId: string | null; items: string[] | null }) {
  const parsed = z
    .object({ circleId: uuid.nullable(), items: z.array(z.enum(SHARE_ITEM_IDS as [ShareItem, ...ShareItem[]])).max(10).nullable() })
    .safeParse(input);
  if (!parsed.success) return { error: "Invalid sharing setting." };
  return run(async (userId) => (await social.setSharing(userId, parsed.data.circleId, parsed.data.items), {}), ["/friends/sharing"]);
}

export async function setPausedAction(paused: boolean) {
  return run(async (userId) => (await social.setPaused(userId, Boolean(paused)), {}), ["/friends/sharing", "/friends"]);
}

// Cheers ----------------------------------------------------------------

export async function cheerAction(input: { to: string; kind: string; note?: string | null; circleId?: string | null }) {
  const parsed = z
    .object({ to: id, kind: z.enum(["fire", "strong", "proud", "clap", "note"]), note: z.string().max(140).nullish(), circleId: uuid.nullish() })
    .safeParse(input);
  if (!parsed.success) return { error: "Invalid cheer." };
  if (parsed.data.kind === "note" && !parsed.data.note?.trim()) return { error: "Write a short message first." };
  return run(async (userId) => (await social.sendCheer(userId, parsed.data.to, parsed.data.kind, parsed.data.note ?? null, parsed.data.circleId ?? null), {}));
}

// Circles ---------------------------------------------------------------

const circleSchema = z.object({ name: z.string().trim().min(2, "Name needs at least 2 characters.").max(60), emoji: z.string().trim().max(8).nullish() });

export async function createCircleAction(input: { name: string; emoji?: string | null }) {
  const parsed = circleSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid circle." };
  const res = await run((userId) => social.createCircle(userId, parsed.data.name, parsed.data.emoji || null).then((circleId) => ({ circleId })), ["/circles"]);
  if (res.error !== undefined) return { error: res.error };
  redirect(`/circles/${res.circleId}`);
}

export async function renameCircleAction(circleId: string, input: { name: string; emoji?: string | null }) {
  const parsed = circleSchema.safeParse(input);
  if (!uuid.safeParse(circleId).success || !parsed.success) return { error: "Invalid circle." };
  return run(async (userId) => (await social.renameCircle(userId, circleId, parsed.data.name, parsed.data.emoji || null), {}), [`/circles/${circleId}`]);
}

export async function leaveCircleAction(circleId: string) {
  if (!uuid.safeParse(circleId).success) return { error: "Invalid circle." };
  const res = await run(async (userId) => (await social.leaveCircle(userId, circleId), {}), ["/circles"]);
  if (res.error !== undefined) return { error: res.error };
  redirect("/circles");
}

export async function removeMemberAction(circleId: string, member: string) {
  if (!uuid.safeParse(circleId).success || !id.safeParse(member).success) return { error: "Invalid request." };
  return run(async (userId) => (await social.removeMember(userId, circleId, member), {}), [`/circles/${circleId}`]);
}

export async function setRoleAction(circleId: string, member: string, role: "admin" | "member") {
  if (!uuid.safeParse(circleId).success || !id.safeParse(member).success || !["admin", "member"].includes(role)) return { error: "Invalid request." };
  return run(async (userId) => (await social.setMemberRole(userId, circleId, member, role), {}), [`/circles/${circleId}`]);
}

// Races -----------------------------------------------------------------

export async function createRaceAction(input: { circleId?: string | null; friendId?: string | null; kind: string; days: number; teams?: boolean; title?: string }) {
  const parsed = z
    .object({
      circleId: uuid.nullish(),
      friendId: id.nullish(),
      kind: z.enum(RACE_KINDS.map((k) => k.id) as [string, ...string[]]),
      days: z.number().int().min(1).max(30),
      teams: z.boolean().optional(),
      title: z.string().trim().max(80).optional(),
    })
    .safeParse(input);
  if (!parsed.success) return { error: "Please check the race details." };
  const d = parsed.data;
  const res = await run((userId) =>
    social
      .createRace(userId, { circleId: d.circleId ?? null, friendId: d.friendId ?? null, kind: d.kind as RaceKind, days: d.days, teams: Boolean(d.teams), title: d.title })
      .then((raceId) => ({ raceId })),
  );
  if (res.error !== undefined) return { error: res.error };
  redirect(`/races/${res.raceId}`);
}

export async function joinRaceAction(raceId: string, privately: boolean) {
  if (!uuid.safeParse(raceId).success) return { error: "Invalid race." };
  return run(async (userId) => (await social.joinRace(userId, raceId, Boolean(privately)), {}), [`/races/${raceId}`]);
}

export async function leaveRaceAction(raceId: string) {
  if (!uuid.safeParse(raceId).success) return { error: "Invalid race." };
  return run(async (userId) => (await social.leaveRace(userId, raceId), {}), [`/races/${raceId}`]);
}

// Notifications ---------------------------------------------------------

export async function markReadAction() {
  return run(async (userId) => (await social.markAllRead(userId), {}), ["/"]);
}

export async function pushKeyAction() {
  return run(async () => ({ key: (await vapidKeys()).publicKey }));
}

export async function savePushAction(sub: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  const parsed = z
    .object({ endpoint: z.string().url().max(1000).startsWith("https://"), keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }) })
    .safeParse(sub);
  if (!parsed.success) return { error: "This browser's notification setup isn't supported." };
  return run(async (userId) => (await saveSubscription(userId, parsed.data), {}));
}

export async function removePushAction(endpoint: string) {
  return run(async (userId) => (await removeSubscription(userId, String(endpoint).slice(0, 1000)), {}));
}
