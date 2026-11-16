import { PageHeader } from "@/components/ui";
import { Breathe, Grounding, Sounds, VentAndBurn } from "./calm";

export const metadata = { title: "Calm Corner" };

export default function CalmPage() {
  return (
    <>
      <PageHeader
        eyebrow="Practice"
        title="Calm Corner"
        description="Stress ho to 1-2 minute yahan. Breathing, gussa nikalne ki jagah, sukoon ki awaaz aur grounding. Sab tumhare phone par hi chalta hai, kuch save nahi hota."
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
