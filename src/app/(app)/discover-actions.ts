"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/db/server";
import * as discover from "@/lib/server/discover";
import * as social from "@/lib/server/social";

type Result<T = object> = ({ error?: undefined } & T) | ({ error: string } & Partial<T>);

async function run<T extends object>(fn: (userId: string) => Promise<T>, revalidate: string[] = []): Promise<Result<T>> {
  const { user } = await requireUser();
  try {
    const out = await fn(user.id);
    for (const p of revalidate) revalidatePath(p, p === "/" ? "layout" : "page");
    return out;
  } catch (err) {
    if (err instanceof discover.DiscoverError || err instanceof social.SocialError) return { error: err.message };
    console.error("[discover action]", err);
    await (await import("@/lib/server/errors")).logError("server", "action:discover", err);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function saveDiscoveryAction(input: { username?: string; isPublic?: boolean; items?: string[]; bio?: string }) {
  return run((uid) => discover.saveDiscovery(uid, input), ["/settings", "/friends", "/me"]);
}

export async function checkUsernameAction(handle: string): Promise<{ ok: boolean; error?: string }> {
  const { user } = await requireUser();
  if (typeof handle !== "string") return { ok: false, error: "Pick a username." };
  return discover.usernameAvailable(user.id, handle);
}

export async function searchUsersAction(query: string): Promise<Result<{ results: discover.PersonResult[] }>> {
  return run(async (uid) => ({ results: typeof query === "string" ? await discover.searchUsers(uid, query) : [] }));
}

export async function sendRequestAction(otherId: string) {
  return run((uid) => social.sendFriendRequest(uid, String(otherId)), ["/friends"]);
}

export async function respondRequestAction(otherId: string, accept: boolean) {
  return run(async (uid) => {
    await social.respondRequest(uid, String(otherId), Boolean(accept));
    return {};
  }, ["/friends", "/inbox"]);
}

export async function cancelRequestAction(otherId: string) {
  return run(async (uid) => {
    await social.cancelRequest(uid, String(otherId));
    return {};
  }, ["/friends"]);
}
