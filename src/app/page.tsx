import { Intro } from "@/components/Intro";
import { Hero } from "@/components/Hero";
import { Marquee } from "@/components/Marquee";
import { Doors } from "@/components/Doors";
import { PageShell } from "@/components/motion/PageShell";

export default function Home() {
  return (
    <PageShell>
      <Intro />
      <Hero />
      <Marquee />
      <Doors />
      <Marquee tone="ink" tilt={2} reverse />
      <div className="h-24 sm:h-32" />
    </PageShell>
  );
}
