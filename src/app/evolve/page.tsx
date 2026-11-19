import type { Metadata } from "next";
import { Evolve } from "@/components/evolve/Evolve";
import { PageShell } from "@/components/motion/PageShell";

export const metadata: Metadata = {
  title: "Evolve",
  description: "Every head starts asleep. Feed it, play Feed the Head and bring friends to evolve it from Dormant to Evolved before the JustHeadz free mint.",
  alternates: { canonical: "/evolve" },
};

export default function EvolvePage() {
  return (
    <PageShell>
      <Evolve />
    </PageShell>
  );
}
