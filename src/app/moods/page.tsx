import type { Metadata } from "next";
import { MoodBoard } from "@/components/MoodBoard";
import { PageShell } from "@/components/motion/PageShell";

export const metadata: Metadata = { title: "Moods", description: "No traits list, no rarity table. Find the JustHeadz face you're making right now.", alternates: { canonical: "/moods" } };

export default function MoodsPage() {
  return (
    <PageShell>
      <MoodBoard />
    </PageShell>
  );
}
