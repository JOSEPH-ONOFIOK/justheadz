"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Eyes } from "./Eyes";
import { Floaters } from "./motion/Floaters";
import { Title } from "./motion/Title";

export function Hero() {
  const art = useRef<HTMLDivElement>(null);

  // Lean in as you scroll: the peek zooms toward you
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const p = Math.min(window.scrollY / window.innerHeight, 1);
        art.current?.style.setProperty("transform", `translateY(${p * 60}px) scale(${1 + p * 0.22}) rotate(${p * -2}deg)`);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section className="relative flex flex-col justify-center overflow-hidden pt-24 pb-6 sm:min-h-dvh sm:pb-10">
      <h1 className="sr-only">JustHeadz: new evolution</h1>

      {/* rotating manga speed lines behind the peek */}
      <div className="burst-bg pointer-events-none absolute top-1/2 left-1/2 aspect-square w-[170vmax] -translate-x-1/2 -translate-y-1/2" aria-hidden="true" />

      <Floaters />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-8">
        <Title as="p" text="We see you." delay={1400} className="intro-delay text-[clamp(2.4rem,7vw,5.5rem)] text-wine" />
      </div>

      <div ref={art} className="relative z-10 -mx-[2vw] my-2 origin-center will-change-transform sm:my-0">
        <div className="peek-in">
          <Eyes viewBox="400 200 2000 660" className="block aspect-[4/3] w-full sm:aspect-[2000/660]" />
        </div>
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-start gap-6 px-4 sm:flex-row sm:items-end sm:justify-between sm:px-8">
        <p className="max-w-md text-lg font-medium leading-snug">
          Heads only. No bodies, no mercy. A pile of faces that scream, sulk and smirk, and every one of them is already watching you.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link href="/whitelist" className="btn bg-wine text-bone">
            <span>Get whitelisted</span>
          </Link>
          <Link href="/pile" className="btn bg-bone">
            <span>Poke the pile</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
