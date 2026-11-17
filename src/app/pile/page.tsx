import type { Metadata } from "next";
import { HeadPile } from "@/components/HeadPile";
import { PageShell } from "@/components/motion/PageShell";

export const metadata: Metadata = { title: "The Pile", description: "Nine heads with tempers. Hover to wake one, click to poke it.", alternates: { canonical: "/pile" } };

export default function PilePage() {
  return (
    <PageShell>
      <HeadPile />
    </PageShell>
  );
}
