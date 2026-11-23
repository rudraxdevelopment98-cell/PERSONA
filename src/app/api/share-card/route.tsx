import { ImageResponse } from "next/og";
import { DIMENSION_META } from "@/lib/domain/dimensions";
import { PROGRAMME_LENGTH } from "@/lib/domain/programme";
import { getGamification } from "@/lib/server/gamification";
import { getUserState } from "@/lib/server/state";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/**
 * A 1080×1350 progress card (Instagram/WhatsApp status size) built only from
 * numbers the person already sees: day, streak, level, current season and their
 * biggest skill gain. Never journal text, answers or scores they haven't earned.
 */
export async function GET() {
  const t = await getT();
  const [{ db, user, state }, { stats, level }] = await Promise.all([getUserState(), getGamification()]);
  const name = (state.profile.display_name || "Me").slice(0, 24);
  const { data: rows } = await db.from("daily_sessions").select("variety").eq("user_id", user.id).order("day_number", { ascending: false }).limit(1);
  const v = (rows?.[0]?.variety ?? null) as { season?: number; episode?: number } | null;
  const best = [...state.skills].sort((a, b) => b.current - b.baseline - (a.current - a.baseline))[0];
  const gain = best ? Math.round((best.current - best.baseline) * 10) / 10 : 0;

  const stat = (value: string, label: string) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
      <div style={{ fontSize: 88, fontWeight: 800, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 30, color: "rgba(255,255,255,0.7)", marginTop: 14 }}>{t(label)}</div>
    </div>
  );

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#26364a", color: "white", padding: 90, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div style={{ width: 76, height: 76, borderRadius: 22, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, fontWeight: 800 }}>{t("P")}</div>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 800 }}>
            <span>{t("PERSONA")}{" "}</span>
            <span style={{ color: "#2dd4bf" }}>90</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 120 }}>
          <div style={{ display: "flex", fontSize: 40, color: "rgba(255,255,255,0.7)" }}>{t("{0} is on", name)}</div>
          <div style={{ display: "flex", alignItems: "flex-end", fontSize: 190, fontWeight: 800, lineHeight: 1, marginTop: 10 }}>
            {t("Day {0}", Math.max(1, state.day))}
            <span style={{ fontSize: 90, color: "rgba(255,255,255,0.4)", marginLeft: 20, marginBottom: 22 }}>{`/ ${PROGRAMME_LENGTH}`}</span>
          </div>
          {v?.season ? (
            <div style={{ display: "flex", marginTop: 30, fontSize: 34, color: "#2dd4bf", fontWeight: 700 }}>
              {t("Season {0} · Episode {1}", v.season, v.episode ?? "")}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", marginTop: 90, padding: "56px 20px", borderRadius: 48, background: "rgba(255,255,255,0.08)" }}>
          {stat(`🔥 ${stats.streak}`, "day streak")}
          {stat(`Lv ${level.level}`, level.name)}
          {stat(`${stats.sessionsCompleted}`, "sessions")}
        </div>

        {best && gain > 0 ? (
          <div style={{ display: "flex", alignItems: "center", marginTop: 50, fontSize: 38 }}>
            <span style={{ color: "#2dd4bf", fontWeight: 800 }}>{`+${gain}`}</span>
            <span>{" " + t("in {0}", DIMENSION_META[best.dimension].label.toLowerCase())}</span>
          </div>
        ) : null}

        <div style={{ display: "flex", marginTop: "auto", fontSize: 32, color: "rgba(255,255,255,0.6)" }}>{t("30 minutes a day · join me on PERSONA 90")}</div>
      </div>
    ),
    { width: 1080, height: 1350, headers: { "Cache-Control": "private, no-store" } },
  );
}
