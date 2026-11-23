import { PageHeader } from "@/components/ui";
import { Breathe, Grounding, Sounds, VentAndBurn } from "./calm";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Calm Corner" };

export default async function CalmPage() {
  const t = await getT();
  return (
    <>
      <PageHeader
        eyebrow={t("Practice")}
        title={t("Calm Corner")}
        description={t("Stress ho to 1-2 minute yahan. Kuch save nahi hota.")}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Breathe />
        <div className="grid content-start gap-4">
          <VentAndBurn />
          <Sounds />
          <Grounding />
        </div>
      </div>
    </>
  );
}
