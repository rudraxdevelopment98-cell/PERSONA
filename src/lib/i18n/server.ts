import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/db/server";
import { getPool } from "@/lib/db/pool";
import { isLanguage, type Language } from "@/lib/domain/languages";
import { makeT, type TFn } from "./core";
import { dictFor } from "./dicts";

export const LANG_COOKIE = "p90_lang";

/** The person's app language: their profile when signed in, else the last choice on this device. */
export const getLang = cache(async (): Promise<Language> => {
  const user = await getSessionUser().catch(() => null);
  if (user) {
    const { rows } = await getPool()
      .query<{ language: string }>("select language from public.profiles where id = $1", [user.id])
      .catch(() => ({ rows: [] as { language: string }[] }));
    if (isLanguage(rows[0]?.language)) return rows[0].language;
  }
  const c = (await cookies()).get(LANG_COOKIE)?.value;
  return isLanguage(c) ? c : "en";
});

/** Translator for server components: `const t = await getT();` */
export async function getT(): Promise<TFn> {
  return makeT(dictFor(await getLang()));
}
