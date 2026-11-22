/* Shared look for link-preview images (WhatsApp, Instagram DMs, X, LinkedIn): brand navy + teal only. */
export const OG_SIZE = { width: 1200, height: 630 };

export function OgFrame({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 72px",
        background: "linear-gradient(150deg, #26364a 0%, #1b2738 55%, #0e9f8a 140%)",
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, background: "white", color: "#26364a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38, fontWeight: 800 }}>
          P
        </div>
        <div style={{ display: "flex", fontSize: 40, fontWeight: 800 }}>
          PERSONA<span style={{ color: "#2dd4bf", marginLeft: 10 }}>90</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 28, color: "#2dd4bf", fontWeight: 700, letterSpacing: 2 }}>{eyebrow}</div>
        <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.08, marginTop: 14, maxWidth: 1000 }}>{title}</div>
        <div style={{ fontSize: 32, color: "rgba(255,255,255,0.78)", marginTop: 22, maxWidth: 980 }}>{sub}</div>
      </div>
      <div style={{ display: "flex", gap: 14 }}>
        {["Roz ek kahani", "Faisla tumhara", "Confidence · Communication · Decisions"].map((t) => (
          <div key={t} style={{ display: "flex", padding: "10px 20px", borderRadius: 999, background: "rgba(255,255,255,0.12)", fontSize: 24 }}>
            {t}
          </div>
        ))}
      </div>
    </div>
  );
}
