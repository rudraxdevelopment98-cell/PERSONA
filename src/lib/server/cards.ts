import "server-only";
import { getPool } from "@/lib/db/pool";
import { generateStructured, runWithAIContext } from "@/lib/ai/client";
import { todayIn } from "@/lib/domain/programme";
import { CARDS_PER_DAY, CARDS_SYSTEM, deckLang, deckSchema, type DeckLang, fallbackDeck, type QuickCard } from "@/lib/domain/cards";

const q = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => (await getPool().query(sql, params)).rows as T[];

/** Today's shared deck for a language: made once by AI for everyone, or the built-in set if AI fails. */
async function deckFor(date: string, lang: DeckLang): Promise<QuickCard[]> {
  const [row] = await q<{ cards: QuickCard[] }>("select cards from public.daily_cards where card_date = $1 and lang = $2", [date, lang]);
  if (row) return row.cards;
  let cards: QuickCard[];
  let source: "ai" | "fallback" = "ai";
  try {
    const out = await runWithAIContext({ userId: null, feature: "cards.daily", tier: "free" }, () =>
      generateStructured({
        system: CARDS_SYSTEM,
        prompt: `Write today's ${CARDS_PER_DAY} quick cards (date ${date}).`,
        schema: deckSchema,
        effort: "low",
        maxTokens: 3000,
        language: lang === "hi" ? "hinglish" : lang === "hindi" ? "hi" : lang,
      }),
    );
    cards = out.cards.slice(0, CARDS_PER_DAY).map((c) => ({
      skill: c.skill.slice(0, 40),
      situation: c.situation.slice(0, 220),
      a: c.a.slice(0, 120),
      b: c.b.slice(0, 120),
      better: c.better === "b" ? "b" : "a",
      why: c.why.slice(0, 220),
    }));
    if (cards.length < CARDS_PER_DAY) throw new Error("short deck");
  } catch (err) {
    console.warn("[cards] using built-in deck:", (err as Error).message);
    cards = fallbackDeck(lang, date);
    source = "fallback";
  }
  // The first request of the day stores the deck; anyone racing it reads the stored one.
  await q("insert into public.daily_cards (card_date, lang, cards, source) values ($1, $2, $3, $4) on conflict do nothing", [date, lang, JSON.stringify(cards), source]);
  const [stored] = await q<{ cards: QuickCard[] }>("select cards from public.daily_cards where card_date = $1 and lang = $2", [date, lang]);
  return stored?.cards ?? cards;
}

export type CardsView = {
  date: string;
  cards: { skill: string; situation: string; a: string; b: string }[];
  answers: { idx: number; choice: "a" | "b"; correct: boolean; better: "a" | "b"; why: string }[];
  streak: number;
};

async function ctx(userId: string) {
  const [p] = await q<{ timezone: string; language: string | null }>("select timezone, language from public.profiles where id = $1", [userId]);
  const date = todayIn(p?.timezone ?? "UTC");
  return { date, lang: deckLang(p?.language) };
}

/** Today's cards without answers (so they can't be peeked), plus what this person already answered. */
export async function todayCards(userId: string): Promise<CardsView> {
  const { date, lang } = await ctx(userId);
  const deck = await deckFor(date, lang);
  const rows = await q<{ idx: number; choice: "a" | "b"; correct: boolean }>("select idx, choice, correct from public.card_answers where user_id = $1 and card_date = $2 order by idx", [userId, date]);
  const days = await q<{ d: string }>(
    "select distinct card_date::text as d from public.card_answers where user_id = $1 and card_date > $2::date - 60 order by d desc",
    [userId, date],
  );
  let streak = 0;
  for (let i = 0; ; i++) {
    const want = new Date(Date.parse(`${date}T00:00:00Z`) - i * 86_400_000).toISOString().slice(0, 10);
    if (days.some((x) => x.d === want)) streak++;
    else if (i === 0) continue;
    else break;
  }
  return {
    date,
    cards: deck.map(({ skill, situation, a, b }) => ({ skill, situation, a, b })),
    answers: rows.map((r) => ({ ...r, better: deck[r.idx].better, why: deck[r.idx].why })),
    streak,
  };
}

export async function answerCard(userId: string, idx: number, choice: "a" | "b") {
  const { date, lang } = await ctx(userId);
  const deck = await deckFor(date, lang);
  const card = deck[idx];
  if (!card) throw new Error("no card");
  await q(
    "insert into public.card_answers (user_id, card_date, idx, choice, correct) values ($1, $2, $3, $4, $5) on conflict (user_id, card_date, idx) do nothing",
    [userId, date, idx, choice, card.better === choice],
  );
  const [r] = await q<{ choice: "a" | "b"; correct: boolean }>("select choice, correct from public.card_answers where user_id = $1 and card_date = $2 and idx = $3", [userId, date, idx]);
  return { idx, choice: r.choice, correct: r.correct, better: card.better, why: card.why };
}
